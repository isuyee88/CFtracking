/**
 * @fileoverview D1 stats 查询的有界时间窗与聚合预算工具
 * @description 为 `/api/clicks/stats` 与 `/api/conversions/stats` 归一化时间窗，
 *   并生成带 `timestamp` 过滤与行读上限的聚合 SQL。
 * @module handlers/d1/stats-query
 * @owner data-layer
 *
 * 背景（why）:
 *   两个 stats 方法原先只做 `WHERE timestamp >= ? AND timestamp <= ?` 的无界聚合。
 *   调用方传一个很大的日期范围时，聚合会扫描范围内全部行；D1 单查询最多读 7500
 *   行（AGENTS.md「D1 7500 / row read limit」），大时间窗会直接失败或拖慢列表+stats
 *   的并发请求。列表 COUNT 已在 list-query.ts 收口，stats 需要同等约束。
 *
 * 不变量（invariant）:
 *   - 时间窗缺失或非法时回退默认最近 7 天，并通过 rangeDefaulted 显式标记；
 *   - 时间窗超过 90 天时保留 endDate、把 startDate 前移到 endDate - 90d，并通过
 *     rangeCapped 显式标记，禁止静默截断；
 *   - 聚合只读 `WHERE timestamp >= ? AND timestamp <= ?` 命中的索引区间，并在子查询
 *     内 `ORDER BY timestamp DESC LIMIT ?`，最多读 STATS_ROW_LIMIT 行；
 *   - 子查询带 LIMIT 时 SQLite 不会把它展平进外层聚合，行读上限才真正生效；
 *   - 分组 SQL 内部同样有 LIMIT（行上限 + topN），不返回无界分组结果；
 *   - 本模块只做纯计算与 SQL 字符串构造，不访问 D1，可安全重复调用（幂等）。
 *
 * 已知限制（residual risk）:
 *   行读上限是静态的 7000 行，不是按时间自适应。窗口内行数达到上限时，stats 与
 *   分组结果都是下界（rowCapped=true），需要更精确的数值只能缩小时间窗或加筛选。
 *   聚合依赖 `idx_clicks_timestamp` / `idx_conversions_timestamp`；如果生产库缺少
 *   该索引（或查询计划改走全表），行读预算仍需靠 LIMIT 兜底，但性能会下降。
 *
 * @see docs/architecture/contracts/cftracking-api-v1.md
 * @see handlers/d1/list-query.ts
 */

import { D1_ROW_READ_BUDGET } from './list-query';

/** stats 默认时间窗：最近 7 天。 */
export const STATS_DEFAULT_WINDOW_DAYS = 7;

/** stats 时间窗硬上限：90 天。超过时保留 endDate 并前移 startDate。 */
export const STATS_MAX_WINDOW_DAYS = 90;

/** stats 聚合/分组单次最多读取的行数，给索引差异留出与 list-query 相同的余量。 */
export const STATS_ROW_LIMIT = D1_ROW_READ_BUDGET - 500;

/** 可选分组（topN）的一次最多返回条数。 */
export const STATS_TOP_N_MAX = 50;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMEZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

/** 归一化后的 stats 时间窗；range 字段会原样进入响应。 */
export interface StatsWindow {
  /** 实际生效的起始时间（ISO 8601，UTC）。 */
  startDate: string;
  /** 实际生效的结束时间（ISO 8601，UTC）。 */
  endDate: string;
  /** 请求区间超过 STATS_MAX_WINDOW_DAYS，已截断为 endDate - 90d。 */
  rangeCapped: boolean;
  /** 请求缺失或非法，已回退默认最近 7 天。 */
  rangeDefaulted: boolean;
}

/** topN 分组结果的一项。 */
export interface StatsBreakdownItem {
  value: string;
  clicks: number;
}

interface ParsedBound {
  ms: number;
  iso: string;
}

/**
 * 解析单个时间边界。
 *
 * 为什么补全时间：前端传 `YYYY-MM-DD`，直接与 ISO timestamp 字符串做字典序比较会
 * 把 endDate 当天整体排除（`'2026-10-22T...' > '2026-10-22'`）。这里按 UTC 补成
 * 当天 00:00:00.000 / 23:59:59.999，与生产 stats 的既有归一化行为一致。
 *
 * @param raw 原始边界；非字符串或空串视为非法。
 * @param boundary start 补当天起点，end 补当天终点。
 * @returns 毫秒时间戳与标准 ISO；非法返回 null。
 */
function parseBound(raw: unknown, boundary: 'start' | 'end'): ParsedBound | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  let candidate = value;
  if (DATE_ONLY_PATTERN.test(candidate)) {
    candidate = `${candidate}${boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z'}`;
  } else if (candidate.includes('T') && !TIMEZONE_SUFFIX_PATTERN.test(candidate)) {
    // 无时区的 ISO 串按 UTC 解释，避免 Worker 运行环境差异导致窗口漂移。
    candidate = `${candidate}Z`;
  }

  const ms = Date.parse(candidate);
  if (!Number.isFinite(ms)) return null;

  return { ms, iso: new Date(ms).toISOString() };
}

/**
 * 把调用方时间归一化为有界 stats 窗口。
 *
 * @param startDate 请求起始时间；`YYYY-MM-DD` 或 ISO 8601。
 * @param endDate 请求结束时间；`YYYY-MM-DD` 或 ISO 8601。
 * @param now 当前时间，仅测试注入；非法值回退 `new Date()`。
 * @returns 生效时间窗、截断标记与默认回退标记；纯函数、无副作用。
 */
export function resolveStatsWindow(
  startDate?: string,
  endDate?: string,
  now: Date = new Date()
): StatsWindow {
  const start = parseBound(startDate, 'start');
  const end = parseBound(endDate, 'end');
  const nowMs = Number.isFinite(now.getTime()) ? now.getTime() : Date.now();

  if (!start || !end || start.ms > end.ms) {
    return {
      startDate: new Date(nowMs - STATS_DEFAULT_WINDOW_DAYS * DAY_MS).toISOString(),
      endDate: new Date(nowMs).toISOString(),
      rangeCapped: false,
      rangeDefaulted: true,
    };
  }

  const capped = end.ms - start.ms > STATS_MAX_WINDOW_DAYS * DAY_MS;
  const effectiveStartMs = capped ? end.ms - STATS_MAX_WINDOW_DAYS * DAY_MS : start.ms;

  return {
    startDate: new Date(effectiveStartMs).toISOString(),
    endDate: end.iso,
    rangeCapped: capped,
    rangeDefaulted: false,
  };
}

/**
 * 归一化可选分组条数。
 *
 * @param raw `topN` 查询参数或调用方数值。
 * @returns 0 表示不分组；其余钳制到 [1, STATS_TOP_N_MAX]。
 */
export function normalizeTopN(raw: unknown): number {
  const parsed =
    typeof raw === 'number' ? raw : Number.parseInt(typeof raw === 'string' ? raw : '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.floor(parsed), STATS_TOP_N_MAX);
}

function campaignClause(campaignId?: string): string {
  return campaignId ? ' AND campaignId = ?' : '';
}

/**
 * 构造 click stats 的有界聚合 SQL。
 *
 * 外层聚合只读取内层子查询；子查询命中 `idx_clicks_timestamp` 并按时间倒序取
 * STATS_ROW_LIMIT 行，因此单条查询的行读数有上限，不会退化成全表聚合。
 *
 * @param campaignId 可选 campaign 过滤；存在时追加占位符（绑定顺序：start,end,campaign)。
 * @returns 以 `COUNT(*) AS totalClicks` 开头的 SQL，末尾绑定 STATS_ROW_LIMIT。
 */
export function buildClickStatsSql(campaignId?: string): string {
  return `
    SELECT
      COUNT(*) AS totalClicks,
      COALESCE(SUM(CASE WHEN isUnique = 1 THEN 1 ELSE 0 END), 0) AS uniqueClicks,
      COUNT(DISTINCT country) AS countries,
      COUNT(DISTINCT device) AS deviceTypes
    FROM (
      SELECT isUnique, country, device
      FROM clicks
      WHERE timestamp >= ? AND timestamp <= ?${campaignClause(campaignId)}
      ORDER BY timestamp DESC
      LIMIT ?
    )
  `;
}

/**
 * 构造 conversion stats 的有界聚合 SQL。
 *
 * @param campaignId 可选 campaign 过滤；绑定顺序同 buildClickStatsSql。
 * @returns 以 `COUNT(*) AS totalConversions` 开头的 SQL，末尾绑定 STATS_ROW_LIMIT。
 */
export function buildConversionStatsSql(campaignId?: string): string {
  return `
    SELECT
      COUNT(*) AS totalConversions,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) AS approvedConversions,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingConversions,
      COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) AS rejectedConversions,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN revenue ELSE 0 END), 0) AS totalRevenue,
      COALESCE(SUM(CASE WHEN status = 'approved' THEN payout ELSE 0 END), 0) AS totalPayout
    FROM (
      SELECT status, revenue, payout
      FROM conversions
      WHERE timestamp >= ? AND timestamp <= ?${campaignClause(campaignId)}
      ORDER BY timestamp DESC
      LIMIT ?
    )
  `;
}

/**
 * 构造 topN 分组 SQL（country/device）。
 *
 * 分组前先受 STATS_ROW_LIMIT 限制，分组结果再受 topN 限制，两层都不会返回无界
 * 结果；`ORDER BY clicks DESC, <column> ASC` 保证同分时顺序稳定，便于测试与调用方。
 *
 * @param table 表名，只接受代码常量 `clicks` / `conversions`。
 * @param column 分组列，只接受代码常量 `country` / `device`。
 * @param campaignId 可选 campaign 过滤。
 * @returns 绑定顺序：start,end[,campaign],STATS_ROW_LIMIT,topN。
 */
export function buildStatsGroupSql(
  table: 'clicks' | 'conversions',
  column: 'country' | 'device',
  campaignId?: string
): string {
  return `
    SELECT ${column} AS value, COUNT(*) AS clicks
    FROM (
      SELECT ${column}
      FROM ${table}
      WHERE timestamp >= ? AND timestamp <= ?${campaignClause(campaignId)}
      ORDER BY timestamp DESC
      LIMIT ?
    )
    WHERE ${column} IS NOT NULL AND ${column} <> ''
    GROUP BY ${column}
    ORDER BY clicks DESC, ${column} ASC
    LIMIT ?
  `;
}

/**
 * 把 D1 聚合结果转成有限数值。
 *
 * SQLite/D1 的 COUNT/SUM 可能返回 null（空窗口）或被序列化成字符串；stats 的既有
 * 契约是 number，这里统一兜底为 0，避免前端拿到 `null` 后直接做数值渲染。
 *
 * @param raw D1 first() 的列值。
 * @returns 有限 number；无法解析时为 0。
 */
export function toFiniteNumber(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

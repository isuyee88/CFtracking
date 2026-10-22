/**
 * @fileoverview D1 列表查询的行读预算工具
 * @description 为 clicks/conversions 等日志大表提供有界的 COUNT 与页码窗口计算。
 * @module handlers/d1/list-query
 * @owner data-layer
 *
 * 背景（why）:
 *   D1 单条查询最多读取 7500 行（AGENTS.md「D1 7500 / row read limit」）。列表接口
 *   原先无条件执行 `SELECT COUNT(*) FROM clicks/conversions`，生产数据量下整条查询
 *   会越过预算并让列表 500。
 *
 * 不变量（invariant）:
 *   - COUNT 走子查询 + LIMIT，SQLite 不会把带 LIMIT 的聚合子查询展平，最多读
 *     LIST_COUNT_CAP + 1 行；
 *   - 列表查询的 LIMIT 为 pageSize + 1（多取 1 行判断 hasMore），页码窗口保证
 *     offset + pageSize + 1 <= LIST_COUNT_CAP + 1；
 *   - 超过 LIST_COUNT_CAP 的 total 是下界而非精确值，调用方必须用 totalCapped /
 *     totalIsApproximate 显式标记，禁止静默当作精确总数；
 *   - 本模块只做纯计算，不访问 D1，可安全重复调用（幂等）。
 *
 * 已知限制（residual risk）:
 *   本模块约束的是 COUNT 与页码窗口，不改变列表查询本身的过滤扫描。`search` 的
 *   LIKE '%x%' 以及无法走索引的过滤条件，在找到 pageSize+1 个匹配行之前仍可能让
 *   D1 扫描超过 7500 行；大表上的模糊搜索需要 FTS5 或更合适的索引才能根治。
 *
 * @see docs/architecture/contracts/cftracking-api-v1.md
 */

import { PAGINATION } from '@/config/constants';

/** D1 单查询行读硬上限（Cloudflare 平台限制）。 */
export const D1_ROW_READ_BUDGET = 7500;

/** 为索引/实现差异预留的读行余量。 */
const COUNT_READ_HEADROOM = 500;

/**
 * 列表计数/翻页的窗口上限（7000）。
 *
 * COUNT 子查询读 LIST_COUNT_CAP + 1 = 7001 行，列表最后一页读
 * offset + pageSize + 1 = 7001 行，都低于 D1 的 7500 行预算。
 */
export const LIST_COUNT_CAP = D1_ROW_READ_BUDGET - COUNT_READ_HEADROOM;

/** 列表接口默认 pageSize（与 PAGINATION 保持一致）。 */
export const LIST_DEFAULT_PAGE_SIZE = PAGINATION.DEFAULT_PAGE_SIZE;

/** 列表接口 pageSize 上限（与 PAGINATION.MAX_PAGE_SIZE 保持一致）。 */
export const LIST_MAX_PAGE_SIZE = PAGINATION.MAX_PAGE_SIZE;

/** 归一化后的页码窗口。 */
export interface ListWindow {
  page: number;
  pageSize: number;
  offset: number;
  /** 请求窗口超出 LIST_COUNT_CAP，服务端不执行任何 D1 查询。 */
  pageOutOfRange: boolean;
}

/** 有界 COUNT 的结果。 */
export interface CappedCount {
  /** 精确值；totalCapped 为 true 时是下界 LIST_COUNT_CAP。 */
  total: number;
  /** 真实行数超过 LIST_COUNT_CAP，total 只是下界。 */
  totalCapped: boolean;
}

/**
 * 把 page/pageSize 归一化到 [1, LIST_MAX_PAGE_SIZE]，并判断窗口是否越界。
 *
 * @param rawPage 调用方传入的页码；NaN/Infinity/<1 回退到 1。
 * @param rawPageSize 调用方传入的每页条数；NaN/Infinity/<1 回退到默认 20。
 * @returns 归一化页码、页大小、offset 与越界标记。
 */
export function resolveListWindow(
  rawPage: number | undefined,
  rawPageSize: number | undefined
): ListWindow {
  const page = toPositiveInt(rawPage, 1);
  const pageSize = Math.min(toPositiveInt(rawPageSize, LIST_DEFAULT_PAGE_SIZE), LIST_MAX_PAGE_SIZE);
  const offset = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    offset,
    pageOutOfRange: offset + pageSize > LIST_COUNT_CAP,
  };
}

/**
 * 构造有界 COUNT SQL。子查询的 LIMIT 由调用方绑定为 LIST_COUNT_CAP + 1。
 *
 * @param table 表名（代码常量，不接受用户输入）。
 * @param whereClause 以 `WHERE ...` 开头的过滤子句，空串表示无过滤。
 * @returns 形如 `SELECT COUNT(*) AS total FROM (SELECT 1 FROM t WHERE ... LIMIT ?)` 的 SQL。
 */
export function buildCappedCountSql(table: string, whereClause: string): string {
  const where = whereClause ? ` ${whereClause}` : '';
  return `SELECT COUNT(*) AS total FROM (SELECT 1 FROM ${table}${where} LIMIT ?)`;
}

/**
 * 解释有界 COUNT 的返回值。
 *
 * @param rawTotal D1 first() 的 total 列。
 * @returns total 精确值或下界；totalCapped 标记是否截断。
 */
export function interpretCappedCount(rawTotal: unknown): CappedCount {
  const count =
    typeof rawTotal === 'number' && Number.isFinite(rawTotal) && rawTotal > 0
      ? Math.floor(rawTotal)
      : 0;

  if (count > LIST_COUNT_CAP) {
    return { total: LIST_COUNT_CAP, totalCapped: true };
  }
  return { total: count, totalCapped: false };
}

function toPositiveInt(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return fallback;
  }
  return Math.floor(value);
}

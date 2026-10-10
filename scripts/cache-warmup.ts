/**
 * @fileoverview 缓存预热脚本
 * @description 定时预热常用数据缓存，确保热点数据在缓存中可用
 * @module scripts/cache-warmup
 *
 * 输入: 预热目标列表（来自cache-config）
 * 输出: 预热执行结果统计
 * 逻辑交互: 通过HTTP请求触发缓存填充
 * 前后端交互: 向Workers发起HTTP GET请求填充Edge和Workers缓存
 */

interface WarmupResult {
  target: string;
  path: string;
  success: boolean;
  status: number;
  durationMs: number;
  error?: string;
}

interface WarmupReport {
  totalTargets: number;
  successful: number;
  failed: number;
  totalDurationMs: number;
  results: WarmupResult[];
  timestamp: string;
}

const DEFAULT_BASE_URL = 'https://cf-tracking.suyee88.workers.dev';
const DEFAULT_AUTH_TOKEN = '';

async function warmupTarget(
  target: { name: string; path: string; priority: number },
  baseUrl: string,
  authToken: string,
): Promise<WarmupResult> {
  const url = `${baseUrl}${target.path}`;
  const start = Date.now();

  try {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-Warmup': 'true',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const durationMs = Date.now() - start;

    return {
      target: target.name,
      path: target.path,
      success: response.ok,
      status: response.status,
      durationMs,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      target: target.name,
      path: target.path,
      success: false,
      status: 0,
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function runWarmup(
  baseUrl: string = DEFAULT_BASE_URL,
  authToken: string = DEFAULT_AUTH_TOKEN,
): Promise<WarmupReport> {
  const targets = [
    { name: 'dashboard', path: '/api/dashboard?range=today', priority: 1 },
    { name: 'campaign-list', path: '/api/campaigns?page=1&pageSize=20', priority: 2 },
    { name: 'offer-list', path: '/api/offers?page=1&pageSize=20', priority: 2 },
    { name: 'flow-list', path: '/api/flows?page=1&pageSize=20', priority: 3 },
    { name: 'stats-overview', path: '/api/stats/overview?range=today', priority: 1 },
  ];

  const sortedTargets = targets.sort((a, b) => a.priority - b.priority);
  const reportStart = Date.now();

  const results: WarmupResult[] = [];
  for (const target of sortedTargets) {
    const result = await warmupTarget(target, baseUrl, authToken);
    results.push(result);

    console.log(
      `[Warmup] ${result.success ? '✓' : '✗'} ${result.target} (${result.durationMs}ms)`,
      result.error ? `- ${result.error}` : '',
    );
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    totalTargets: targets.length,
    successful,
    failed,
    totalDurationMs: Date.now() - reportStart,
    results,
    timestamp: new Date().toISOString(),
  };
}

if (typeof process !== 'undefined' && typeof process.argv !== 'undefined') {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || DEFAULT_BASE_URL;
  const authToken = args[1] || '';

  runWarmup(baseUrl, authToken)
    .then((report) => {
      console.log('\n========== Warmup Report ==========');
      console.log(`Total: ${report.totalTargets}`);
      console.log(`Successful: ${report.successful}`);
      console.log(`Failed: ${report.failed}`);
      console.log(`Duration: ${report.totalDurationMs}ms`);
      console.log(`Timestamp: ${report.timestamp}`);
      console.log('===================================\n');

      if (report.failed > 0) {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Warmup failed:', error);
      process.exit(1);
    });
}

export { runWarmup, warmupTarget };
export type { WarmupResult, WarmupReport };

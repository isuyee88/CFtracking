import http from 'node:http';

interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

const BASE_URL = 'http://localhost:8787';

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: 'GET', path: '/', description: '首页' },
  { method: 'GET', path: '/api/campaigns', description: 'Campaign列表' },
  { method: 'GET', path: '/api/flows', description: 'Flow列表' },
  { method: 'GET', path: '/api/offers', description: 'Offer列表' },
  { method: 'GET', path: '/api/traffic-sources', description: 'TrafficSource列表' },
  { method: 'GET', path: '/api/analytics/dashboard', description: '仪表盘数据' },
  { method: 'GET', path: '/api/reports/clicks', description: '点击报告' },
  { method: 'GET', path: '/api/domains', description: '域名列表' },
  { method: 'GET', path: '/api/landing-pages', description: '落地页列表' },
  { method: 'GET', path: '/api/affiliate-networks', description: '联盟网络列表' },
];

function measureApi(endpoint: ApiEndpoint): Promise<{
  endpoint: string;
  status: number;
  timeMs: number;
  success: boolean;
}> {
  return new Promise((resolve) => {
    const start = Date.now();
    const options = {
      hostname: 'localhost',
      port: 8787,
      path: endpoint.path,
      method: endpoint.method,
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const timeMs = Date.now() - start;
        resolve({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: res.statusCode || 0,
          timeMs,
          success: res.statusCode && res.statusCode >= 200 && res.statusCode < 400,
        });
      });
    });

    req.on('error', (e) => {
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: 0,
        timeMs: Date.now() - start,
        success: false,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: 0,
        timeMs: Date.now() - start,
        success: false,
      });
    });

    req.end();
  });
}

async function runBaselineTest(): Promise<void> {
  console.log('🚀 开始API基线性能测试...\n');
  console.log('='.repeat(80));
  const header = `${'端点'.padEnd(45)} ${'状态'.padStart(8)} ${'耗时(ms)'.padStart(12)} 结果`;
  console.log(header);
  console.log('-'.repeat(80));

  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    const result = await measureApi(endpoint);
    results.push(result);

    const statusIcon = result.success ? '✅' : '❌';
    const statusStr = result.status.toString().padStart(6);
    const timeStr = result.timeMs.toString().padStart(10);
    const desc = `${result.endpoint} ${endpoint.description}`.slice(0, 43).padEnd(43);

    console.log(`${desc} ${statusStr} ${timeStr}ms ${statusIcon}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 统计摘要:\n');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const avgTime =
    results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
  const maxTime = Math.max(...results.map((r) => r.timeMs));
  const minTime = Math.min(...results.map((r) => r.timeMs));
  const p95 = [...results]
    .sort((a, b) => a.timeMs - b.timeMs)
    [Math.floor(results.length * 0.95)]?.timeMs || 0;

  console.log(`总请求数: ${results.length}`);
  console.log(`成功请求: ${successful.length} (${((successful.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`失败请求: ${failed.length} (${((failed.length / results.length) * 100).toFixed(1)}%)`);
  console.log(`平均响应时间: ${avgTime.toFixed(2)}ms`);
  console.log(`最小响应时间: ${minTime}ms`);
  console.log(`最大响应时间: ${maxTime}ms`);
  console.log(`P95 响应时间: ${p95}ms`);

  if (failed.length > 0) {
    console.log('\n⚠️ 失败的端点:');
    failed.forEach((f) => console.log(`  - ${f.endpoint}`));
  }
}

runBaselineTest().catch(console.error);

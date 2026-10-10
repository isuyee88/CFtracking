import http from 'node:http';

const BASE_URL = 'http://localhost:8787';

const endpoints = [
  { path: '/', name: '首页' },
  { path: '/api/health', name: '健康检查' },
  { path: '/api/campaigns', name: 'Campaign列表' },
  { path: '/api/flows', name: 'Flow列表' },
  { path: '/api/offers', name: 'Offer列表' },
  { path: '/api/traffic-sources', name: 'TrafficSource列表' },
];

async function testEndpoint(path: string, name: string): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.get(`${BASE_URL}${path}`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const time = Date.now() - start;
        const icon = res.statusCode >= 200 && res.statusCode < 400 ? '✅' : '❌';
        console.log(
          `${icon} ${path.padEnd(35)} 状态:${String(res.statusCode || 0).padStart(4)} 耗时:${String(time).padStart(4)}ms ${name}`
        );
        resolve();
      });
    });

    req.on('error', () => {
      console.log(`❌ ${path.padEnd(35)} 连接失败          ${name}`);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${path.padEnd(35)} 超时              ${name}`);
      resolve();
    });
  });
}

async function main(): Promise<void> {
  console.log('\n🚀 API 基线性能测试\n');
  console.log('=' .repeat(80));

  for (const ep of endpoints) {
    await testEndpoint(ep.path, ep.name);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

main().catch(console.error);

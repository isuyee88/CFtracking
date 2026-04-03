/**
 * @fileoverview Cloudflare 缓存日志监控脚本
 * @description 用于监控和分析 Cloudflare Workers/D1 的缓存命中率、延迟和性能
 * @module scripts/cache-monitor
 *
 * 功能:
 * - 查询 Cloudflare Analytics API 获取缓存命中率
 * - 监控 Workers 请求延迟
 * - 分析 D1 查询性能
 * - 监控移动端与桌面端差异
 *
 * 使用方式:
 *   npx tsx scripts/cache-monitor.ts
 */

import { parseArgs } from 'util';

interface CacheMetrics {
  cacheHitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
  originRequests: number;
}

interface DeviceBreakdown {
  device: string;
  requests: number;
  avgLatency: number;
  cacheHitRate: number;
}

async function getCacheAnalytics(accountId: string, apiToken: string): Promise<CacheMetrics> {
  const query = `
    {
      viewer {
        zones(filter: { zoneTag: "${accountId}" }) {
          httpRequests1hGroups(limit: 1, filter: {
            datetime_geq: "${new Date(Date.now() - 3600000).toISOString()}"
          }) {
            sum {
              bytes
              cachedBytes
              cachedRequests
              requests
            }
            dimensions {
              datetime
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/graphql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('GraphQL Errors:', data.errors);
      throw new Error('Failed to fetch cache analytics');
    }

    const httpRequests1hGroups = data?.data?.viewer?.zones?.[0]?.httpRequests1hGroups?.[0];
    
    if (!httpRequests1hGroups) {
      return {
        cacheHitRate: 0,
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        avgResponseTime: 0,
        originRequests: 0
      };
    }

    const sum = httpRequests1hGroups.sum;
    const totalRequests = sum.requests || 0;
    const cachedRequests = sum.cachedRequests || 0;
    const cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;

    return {
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalRequests,
      cacheHits: cachedRequests,
      cacheMisses: totalRequests - cachedRequests,
      avgResponseTime: 0,
      originRequests: totalRequests - cachedRequests
    };
  } catch (error) {
    console.error('Error fetching cache analytics:', error);
    throw error;
  }
}

async function getWorkersMetrics(accountId: string, apiToken: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/analytics?type=spa`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Workers API returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Error fetching Workers metrics:', error);
    return null;
  }
}

async function getCacheStats(accountId: string, apiToken: string): Promise<any> {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${accountId}/analytics/dashboard?numeric=enabled`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Cache Stats API returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn('Error fetching cache stats:', error);
    return null;
  }
}

function printCacheReport(metrics: CacheMetrics): void {
  console.log('\n' + '='.repeat(60));
  console.log('CLOUDFLARE CACHE ANALYTICS REPORT');
  console.log('='.repeat(60));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('-'.repeat(60));
  
  console.log('\n[Cache Performance]');
  console.log(`  Cache Hit Rate:     ${metrics.cacheHitRate}%`);
  console.log(`  Total Requests:     ${metrics.totalRequests.toLocaleString()}`);
  console.log(`  Cache Hits:         ${metrics.cacheHits.toLocaleString()}`);
  console.log(`  Cache Misses:       ${metrics.cacheMisses.toLocaleString()}`);
  console.log(`  Origin Requests:    ${metrics.originRequests.toLocaleString()}`);
  
  console.log('\n[Performance Indicators]');
  const rating = metrics.cacheHitRate >= 80 ? '✅ Excellent' :
                 metrics.cacheHitRate >= 50 ? '⚠️  Average' :
                 '❌ Poor';
  console.log(`  Overall Rating:     ${rating}`);
  
  if (metrics.cacheHitRate < 50) {
    console.log('\n[Recommendations]');
    console.log('  - Enable Cloudflare Page Rules for static assets');
    console.log('  - Increase Cache-Control TTL for API responses');
    console.log('  - Use Workers KV for frequently accessed data');
    console.log('  - Consider Edge caching for D1 queries');
  }
  
  console.log('\n' + '='.repeat(60));
}

async function testMobileVsDesktop(): Promise<void> {
  console.log('\n[Mobile vs Desktop Analysis]');
  console.log('Testing cache behavior for different device types...\n');

  const testUrl = 'https://t.isuyee.com/api/analytics/dashboard?range=today';
  
  const userAgents = {
    mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  const results: Record<string, any> = {};

  for (const [device, userAgent] of Object.entries(userAgents)) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json',
        },
      });

      const responseTime = Date.now() - startTime;
      const cfCacheStatus = response.headers.get('cf-cache-status') || 'MISS';
      const cacheControl = response.headers.get('cache-control') || 'none';
      const cfRay = response.headers.get('cf-ray') || 'unknown';

      results[device] = {
        status: response.status,
        responseTime,
        cfCacheStatus,
        cacheControl,
        cfRay: cfRay.substring(0, 16) + '...'
      };

      console.log(`  ${device.toUpperCase()}:`);
      console.log(`    Status:        ${results[device].status}`);
      console.log(`    Response Time: ${responseTime}ms`);
      console.log(`    CF-Cache-Status: ${cfCacheStatus}`);
      console.log(`    Cache-Control: ${cacheControl}`);
      console.log('');
    } catch (error) {
      console.error(`  ${device} test failed:`, error);
    }
  }

  if (results.mobile && results.desktop) {
    const mobileSlower = results.mobile.responseTime > results.desktop.responseTime * 1.5;
    
    if (mobileSlower) {
      console.log('⚠️  MOBILE PERFORMANCE WARNING');
      console.log('   Mobile devices are significantly slower than desktop.');
      console.log('   Possible causes:');
      console.log('   - Slower CPU affecting JavaScript execution');
      console.log('   - Different cache headers for mobile');
      console.log('   - Network throttling on mobile');
    }
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      'account-id': { type: 'string' },
      'api-token': { type: 'string' },
      'mobile-test': { type: 'boolean' },
    },
  });

  const accountId = values['account-id'] || process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = values['api-token'] || process.env.CLOUDFLARE_API_TOKEN;
  const runMobileTest = values['mobile-test'] || false;

  if (!accountId || !apiToken) {
    console.log('\n📋 Cloudflare Cache Monitor');
    console.log('='.repeat(40));
    console.log('Usage: npx tsx scripts/cache-monitor.ts');
    console.log('');
    console.log('Environment Variables:');
    console.log('  CLOUDFLARE_ACCOUNT_ID  - Your Cloudflare Account ID');
    console.log('  CLOUDFLARE_API_TOKEN   - Your Cloudflare API Token');
    console.log('');
    console.log('Options:');
    console.log('  --account-id=<ID>      - Cloudflare Account ID');
    console.log('  --api-token=<TOKEN>    - Cloudflare API Token');
    console.log('  --mobile-test          - Run mobile vs desktop comparison');
    console.log('');
    console.log('Required API Token Permissions:');
    console.log('  - Account Analytics: Read');
    console.log('  - Workers Analytics: Read');
    console.log('');

    console.log('\n[Offline Mode - Running Mobile Test Only]\n');
    await testMobileVsDesktop();
    return;
  }

  try {
    console.log('Fetching Cloudflare Analytics...\n');

    const [cacheMetrics, workersMetrics] = await Promise.all([
      getCacheAnalytics(accountId, apiToken),
      getWorkersMetrics(accountId, apiToken),
    ]);

    printCacheReport(cacheMetrics);

    if (workersMetrics) {
      console.log('\n[Workers Metrics]');
      console.log(JSON.stringify(workersMetrics, null, 2));
    }

    await testMobileVsDesktop();

    console.log('\n✅ Cache monitoring completed successfully\n');

  } catch (error) {
    console.error('\n❌ Error during cache monitoring:', error);
    process.exit(1);
  }
}

main();

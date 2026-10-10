const DEFAULT_BASE_URL = 'https://t.isuyee.com';

interface WarmTarget {
  name: string;
  url: string;
}

interface WarmResult {
  name: string;
  status: number;
  finalUrl: string;
  serverTiming: string;
  cacheControl: string;
  etag: string;
  durationMs: number;
}

function buildTargets(baseUrl: string): WarmTarget[] {
  return [
    { name: 'dashboard:today', url: `${baseUrl}/__bootstrap/dashboard/invalid.json?range=today` },
    { name: 'dashboard:yesterday', url: `${baseUrl}/__bootstrap/dashboard/invalid.json?range=yesterday` },
    { name: 'dashboard:last7days', url: `${baseUrl}/__bootstrap/dashboard/invalid.json?range=last7days` },
    { name: 'dashboard:last30days', url: `${baseUrl}/__bootstrap/dashboard/invalid.json?range=last30days` },
    {
      name: 'campaigns:today',
      url: `${baseUrl}/__bootstrap/campaigns/invalid.json?range=today&__pathname=%2Fcampaigns`,
    },
    {
      name: 'campaigns:yesterday',
      url: `${baseUrl}/__bootstrap/campaigns/invalid.json?range=yesterday&__pathname=%2Fcampaigns`,
    },
    {
      name: 'campaigns:last7days',
      url: `${baseUrl}/__bootstrap/campaigns/invalid.json?range=last7days&__pathname=%2Fcampaigns`,
    },
    {
      name: 'campaigns:last30days',
      url: `${baseUrl}/__bootstrap/campaigns/invalid.json?range=last30days&__pathname=%2Fcampaigns`,
    },
    { name: 'offers', url: `${baseUrl}/__bootstrap/offers/invalid.json?__pathname=%2Foffers` },
    { name: 'landings', url: `${baseUrl}/__bootstrap/landings/invalid.json?__pathname=%2Flandings` },
    {
      name: 'traffic-sources',
      url: `${baseUrl}/__bootstrap/traffic-sources/invalid.json?__pathname=%2Ftraffic-sources`,
    },
    { name: 'domains', url: `${baseUrl}/__bootstrap/domains/invalid.json?__pathname=%2Fdomains` },
    { name: 'rules', url: `${baseUrl}/__bootstrap/rules/invalid.json?__pathname=%2Frules` },
    {
      name: 'trends',
      url: `${baseUrl}/__bootstrap/trends/invalid.json?startDate=2026-03-31&endDate=2026-04-06&__pathname=%2Ftrends`,
    },
    { name: 'audit', url: `${baseUrl}/__bootstrap/audit/invalid.json?__pathname=%2Faudit` },
    {
      name: 'conversions',
      url: `${baseUrl}/__bootstrap/conversions/invalid.json?__pathname=%2Fconversions`,
    },
    { name: 'settings', url: `${baseUrl}/__bootstrap/settings/invalid.json?__pathname=%2Fsettings` },
    { name: 'blacklist', url: `${baseUrl}/__bootstrap/blacklist/invalid.json?__pathname=%2Fblacklist` },
    { name: 'whitelist', url: `${baseUrl}/__bootstrap/whitelist/invalid.json?__pathname=%2Fwhitelist` },
  ];
}

async function warmTarget(target: WarmTarget): Promise<WarmResult> {
  const startedAt = performance.now();
  const response = await fetch(target.url, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
    },
  });
  const durationMs = Math.round(performance.now() - startedAt);

  if (!response.ok) {
    throw new Error(`${target.name} failed with status ${response.status}`);
  }

  await response.arrayBuffer();

  return {
    name: target.name,
    status: response.status,
    finalUrl: response.url,
    serverTiming: response.headers.get('server-timing') ?? '',
    cacheControl: response.headers.get('cloudflare-cdn-cache-control') ?? '',
    etag: response.headers.get('etag') ?? '',
    durationMs,
  };
}

async function main() {
  const baseUrl = process.env.WARM_BASE_URL || DEFAULT_BASE_URL;
  const targets = buildTargets(baseUrl);
  const results: WarmResult[] = [];

  for (const target of targets) {
    const result = await warmTarget(target);
    results.push(result);
    console.log(
      `[warm] ${result.name} status=${result.status} duration=${result.durationMs}ms cache="${result.cacheControl}" timing="${result.serverTiming}"`
    );
  }

  console.log(JSON.stringify({ baseUrl, warmed: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error('[warm] failed', error);
  process.exit(1);
});

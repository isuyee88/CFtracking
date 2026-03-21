/**
 * Script to query Analytics Engine for test data
 */
const accountId = 'd1215a30b84b673ef0367010b0e78c10';
const apiToken = process.env.CF_API_TOKEN;

async function queryAnalytics() {
  const sql = "SELECT blob0 as clickId, blob1 as campaignId, blob2 as flowId, timestamp FROM cf_tracking_events WHERE blob0 = 'clk_aee4014f-4b6f-4c37-84f6-eddcf16587e9' OR blob1 LIKE '%test-campaign%' LIMIT 10";

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql })
    }
  );

  const data = await response.json();
  console.log('Query Result:', JSON.stringify(data, null, 2));
}

queryAnalytics().catch(console.error);

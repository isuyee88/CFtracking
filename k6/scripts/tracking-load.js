import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('tracking_errors');
const profile = __ENV.K6_PROFILE || 'smoke';

const profiles = {
  smoke: {
    scenarios: {
      tracking_smoke: {
        executor: 'constant-arrival-rate',
        rate: 1,
        timeUnit: '1s',
        duration: '10s',
        preAllocatedVUs: 1,
        maxVUs: 2,
      },
    },
    thresholds: {
      http_req_duration: ['p(99)<1000'],
      tracking_errors: ['rate<0.1'],
    },
  },
  stress: {
    scenarios: {
      tracking_load: {
        executor: 'constant-arrival-rate',
        rate: 100,
        timeUnit: '1s',
        duration: '30s',
        preAllocatedVUs: 50,
        maxVUs: 100,
      },
    },
    thresholds: {
      http_req_duration: ['p(99)<200'],
      tracking_errors: ['rate<0.05'],
    },
  },
};

if (!profiles[profile]) {
  throw new Error(`Unsupported K6_PROFILE=${profile}; use smoke or stress`);
}

export const options = profiles[profile];
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
const CAMPAIGN_ID = __ENV.CAMPAIGN_ID || 'test-campaign';

export default function () {
  const payload = {
    campaignId: CAMPAIGN_ID,
    ip: `192.168.${__VU % 256}.${__ITER % 256}`,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    referrer: 'https://example.com/',
    url: `${BASE_URL}/click/${CAMPAIGN_ID}`,
  };

  const res = http.post(`${BASE_URL}/api/tracking/click`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'tracking' },
  });

  errorRate.add(res.status !== 200 && res.status !== 201);

  check(res, {
    'tracking accepted': (r) =>
      r.status === 200 || r.status === 201 || r.status === 301 || r.status === 302,
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });
}

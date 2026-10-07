import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiResponseTime = new Trend('api_response_time');
const profile = __ENV.K6_PROFILE || 'smoke';

const profiles = {
  smoke: {
    stages: [
      { duration: '5s', target: 1 },
      { duration: '10s', target: 1 },
      { duration: '5s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      errors: ['rate<0.1'],
    },
  },
  stress: {
    stages: [
      { duration: '10s', target: 10 },
      { duration: '20s', target: 50 },
      { duration: '30s', target: 100 },
      { duration: '20s', target: 50 },
      { duration: '10s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<500'],
      errors: ['rate<0.1'],
    },
  },
};

if (!profiles[profile]) {
  throw new Error(`Unsupported K6_PROFILE=${profile}; use smoke or stress`);
}

export const options = profiles[profile];
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';

export default function () {
  const endpoints = [
    '/api/campaigns',
    '/api/flows',
    '/api/offers',
    '/api/traffic-sources',
    '/api/analytics/dashboard',
  ];

  endpoints.forEach((endpoint) => {
    const res = http.get(`${BASE_URL}${endpoint}`, {
      tags: { endpoint: endpoint.replace('/', '_') },
    });

    apiResponseTime.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} response time < 1000ms`]: (r) => r.timings.duration < 1000,
    });
  });

  sleep(1);
}

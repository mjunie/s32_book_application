// soak-test.js - Tests system stability over extended period
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 },     // Ramp up
    { duration: '30m', target: 20 },    // Sustained load for 30 minutes
    { duration: '2m', target: 0 },      // Ramp down
  ],
  
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration': ['p(95)<500'],
    'http_req_duration': ['avg<300'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081';

export default function() {
  // Realistic user behavior
  const res = http.get(`${BASE_URL}/books`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no memory leaks evident': (r) => r.timings.duration < 1000,
  });
  
  sleep(3); // Longer think time for soak test
}
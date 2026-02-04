// spike-test.js - Tests system behavior under sudden traffic spikes
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },   // Warm up
    { duration: '10s', target: 10 },   // Stable
    { duration: '10s', target: 100 },  // Sudden spike!
    { duration: '1m', target: 100 },   // Maintain spike
    { duration: '10s', target: 10 },   // Quick recovery
    { duration: '10s', target: 0 },    // Cool down
  ],
  
  thresholds: {
    'http_req_failed': ['rate<0.05'], // Allow 5% failure during spike
    'http_req_duration': ['p(95)<2000'], // More lenient during spike
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:8081';

export default function() {
  const res = http.get(`${BASE_URL}/books`);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time acceptable': (r) => r.timings.duration < 3000,
  });
  
  sleep(0.5);
}
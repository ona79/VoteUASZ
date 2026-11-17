import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '20s', target: 25 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  const electionsRes = http.get(`${BASE_URL}/api/v1/elections`);
  check(electionsRes, {
    'GET /elections status 200': (r) => r.status === 200,
  });

  if (__ENV.LOGIN_IDENTIFIER && __ENV.LOGIN_PASSWORD) {
    const loginRes = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify({
        matriculeOrEmail: __ENV.LOGIN_IDENTIFIER,
        password: __ENV.LOGIN_PASSWORD,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    check(loginRes, {
      'POST /auth/login status 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}

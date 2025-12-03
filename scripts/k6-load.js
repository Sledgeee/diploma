import http from "k6/http";
import { check, sleep } from "k6";

// Configure target host via env, default to local backend API prefix
const BASE_URL = __ENV.BASE_URL || "http://localhost:8000/api";

export const options = {
  scenarios: {
    smoke: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 20 }, // ramp up
        { duration: "1m", target: 20 }, // hold
        { duration: "30s", target: 0 }, // ramp down
      ],
      gracefulRampDown: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% errors
    http_req_duration: ["p(95)<800"], // 95% of requests under 800ms
  },
};

export default function () {
  // Fetch a few endpoints commonly used by the app
  const resBooks = http.get(`${BASE_URL}/books?page=1&limit=12`);
  check(resBooks, {
    "books success": (r) => r.status === 200,
  });

  const resPopular = http.get(`${BASE_URL}/books/popular?limit=5`);
  check(resPopular, {
    "popular success": (r) => r.status === 200,
  });

  const resBook = http.get(
    `${BASE_URL}/books/ef8dbe3c-43df-4e0b-af5d-77fb9607624a`
  );
  check(resBook, {
    "single book success": (r) => r.status === 200,
  });

  // Pause between iterations to avoid overwhelming the service
  sleep(1);
}

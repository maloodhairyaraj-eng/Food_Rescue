
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureContractTest123!";

let userId;
let token;

beforeAll(async () => {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.DB_NAME !== "zero_waste_test_db"
  ) {
    throw new Error("Unsafe test environment");
  }

  const db = await pool.query(
    "SELECT current_database() AS name"
  );

  if (db.rows[0].name !== "zero_waste_test_db") {
    throw new Error("Wrong database");
  }

  const email =
    `food-contract-${crypto.randomUUID()}@example.com`;

  const registration = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: "Food Contract Test",
      email,
      password: PASSWORD,
      role: "ngo",
    });

  expect(registration.status).toBe(201);

  userId = registration.body.data.user.id;

  const login = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(login.status).toBe(200);
  token = login.body.data.accessToken;
});

afterAll(async () => {
  try {
    if (
      userId &&
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      await pool.query(
        "DELETE FROM users WHERE id = $1",
        [userId]
      );
    }
  } finally {
    await pool.end();
  }
});

function auth() {
  return {
    Authorization: `Bearer ${token}`,
  };
}

describe("Food listing frontend contracts", () => {
  test("requires authentication", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings`);

    expect(res.status).toBe(401);
  });

  test("returns standard paginated response", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings?limit=5&offset=0`)
      .set(auth());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.listings))
      .toBe(true);

    expect(res.body.data.pagination)
      .toEqual({
        total: expect.any(Number),
        limit: 5,
        offset: 0,
      });
  });

  test("rejects invalid food filters", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings?foodType=invalid`)
      .set(auth());

    expect(res.status).toBe(400);
  });

  test("rejects invalid pagination", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings?limit=1000`)
      .set(auth());

    expect(res.status).toBe(400);
  });

  test("missing listing returns 404", async () => {
    const missingId = crypto.randomUUID();

    const res = await request(app)
      .get(`${BASE}/food-listings/${missingId}`)
      .set(auth());

    expect(res.status).toBe(404);
  });
});

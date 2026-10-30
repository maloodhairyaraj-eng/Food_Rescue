
const request = require("supertest");
const crypto = require("node:crypto");
const bcrypt = require("bcrypt");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureIntegrationPass123!";

let createdUserIds = [];
let accounts = {};

function uniqueEmail(role) {
  const id = crypto.randomUUID();
  return `${role}-${id}@example.com`;
}

async function register(role) {
  const email = uniqueEmail(role);

  const response = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Integration ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(response.status).toBe(201);

  const user = response.body.data.user;
  createdUserIds.push(user.id);

  return {
    email,
    user,
  };
}

async function login(email, password = PASSWORD) {
  return request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password });
}

async function getToken(email) {
  const response = await login(email);

  expect(response.status).toBe(200);
  expect(response.body.data.accessToken).toBeTruthy();

  return response.body.data.accessToken;
}

async function access(path, token) {
  return request(app)
    .get(`${BASE}/access/${path}`)
    .set("Authorization", `Bearer ${token}`);
}

beforeAll(async () => {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.DB_NAME !== "zero_waste_test_db"
  ) {
    throw new Error(
      "Tests require the isolated zero_waste_test_db"
    );
  }

  const result = await pool.query(
    "SELECT current_database() AS name"
  );

  if (result.rows[0].name !== "zero_waste_test_db") {
    throw new Error("Unsafe database connection");
  }
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      for (const id of createdUserIds) {
        await pool.query(
          "DELETE FROM users WHERE id = $1",
          [id]
        );
      }
    }
  } finally {
    await pool.end();
  }
});

describe("Authentication integration", () => {
  test("health endpoint works", async () => {
    const response = await request(app)
      .get(`${BASE}/health`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("registers an NGO", async () => {
    accounts.ngo = await register("ngo");

    expect(accounts.ngo.user.role).toBe("ngo");
    expect(accounts.ngo.user.password_hash)
      .toBeUndefined();
  });

  test("stores bcrypt password hash", async () => {
    const result = await pool.query(
      `SELECT password_hash
       FROM users WHERE id = $1`,
      [accounts.ngo.user.id]
    );

    const hash = result.rows[0].password_hash;

    expect(hash).not.toBe(PASSWORD);
    expect(await bcrypt.compare(PASSWORD, hash))
      .toBe(true);
  });

  test("rejects duplicate email", async () => {
    const response = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        fullName: "Duplicate User",
        email: accounts.ngo.email,
        password: PASSWORD,
        role: "ngo",
      });

    expect(response.status).toBe(409);
  });

  test("rejects public admin registration", async () => {
    const response = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        fullName: "Fake Admin",
        email: uniqueEmail("admin"),
        password: PASSWORD,
        role: "admin",
      });

    expect(response.status).toBe(400);
  });

  test("rejects weak passwords", async () => {
    const response = await request(app)
      .post(`${BASE}/auth/register`)
      .send({
        fullName: "Weak Password",
        email: uniqueEmail("weak"),
        password: "123",
        role: "ngo",
      });

    expect(response.status).toBe(400);
  });

  test("logs in with valid credentials", async () => {
    const response = await login(accounts.ngo.email);

    expect(response.status).toBe(200);
    expect(response.body.data.accessToken)
      .toBeTruthy();
    expect(response.body.data.tokenType)
      .toBe("Bearer");

    accounts.ngo.token =
      response.body.data.accessToken;
  });

  test("rejects incorrect password", async () => {
    const response = await login(
      accounts.ngo.email,
      "IncorrectPassword123!"
    );

    expect(response.status).toBe(401);
  });

  test("rejects unknown email", async () => {
    const response = await login(
      uniqueEmail("unknown")
    );

    expect(response.status).toBe(401);
  });

  test("protects /me without JWT", async () => {
    const response = await request(app)
      .get(`${BASE}/auth/me`);

    expect(response.status).toBe(401);
  });

  test("rejects malformed JWT", async () => {
    const response = await request(app)
      .get(`${BASE}/auth/me`)
      .set(
        "Authorization",
        "Bearer invalid.token.value"
      );

    expect(response.status).toBe(401);
  });

  test("returns current user with valid JWT", async () => {
    const response = await request(app)
      .get(`${BASE}/auth/me`)
      .set(
        "Authorization",
        `Bearer ${accounts.ngo.token}`
      );

    expect(response.status).toBe(200);
    expect(response.body.data.user.email)
      .toBe(accounts.ngo.email);
    expect(response.body.data.user.password_hash)
      .toBeUndefined();
  });

  test("rejects expired JWT", async () => {
    const jwt = require("jsonwebtoken");

    const expired = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        subject: accounts.ngo.user.id,
        issuer: "zero-waste-api",
        audience: "zero-waste-platform",
        expiresIn: -10,
      }
    );

    const response = await request(app)
      .get(`${BASE}/auth/me`)
      .set("Authorization", `Bearer ${expired}`);

    expect(response.status).toBe(401);
  });

  test("blocks disabled accounts", async () => {
    try {
      await pool.query(
        `UPDATE users
         SET is_active = FALSE
         WHERE id = $1`,
        [accounts.ngo.user.id]
      );

      const response = await request(app)
        .get(`${BASE}/auth/me`)
        .set(
          "Authorization",
          `Bearer ${accounts.ngo.token}`
        );

      expect(response.status).toBe(401);
    } finally {
      await pool.query(
        `UPDATE users
         SET is_active = TRUE
         WHERE id = $1`,
        [accounts.ngo.user.id]
      );
    }
  });
});

describe("Role-based authorization", () => {
  beforeAll(async () => {
    accounts.donor = await register("donor");
    accounts.volunteer = await register("volunteer");

    accounts.donor.token =
      await getToken(accounts.donor.email);

    accounts.volunteer.token =
      await getToken(accounts.volunteer.email);

    accounts.ngo.token =
      await getToken(accounts.ngo.email);
  });

  test("NGO can access NGO route", async () => {
    const response = await access(
      "ngo",
      accounts.ngo.token
    );

    expect(response.status).toBe(200);
  });

  test("NGO cannot access donor route", async () => {
    const response = await access(
      "donor",
      accounts.ngo.token
    );

    expect(response.status).toBe(403);
  });

  test("NGO cannot access admin route", async () => {
    const response = await access(
      "admin",
      accounts.ngo.token
    );

    expect(response.status).toBe(403);
  });

  test("donor can access donor route", async () => {
    const response = await access(
      "donor",
      accounts.donor.token
    );

    expect(response.status).toBe(200);
  });

  test("donor cannot access NGO route", async () => {
    const response = await access(
      "ngo",
      accounts.donor.token
    );

    expect(response.status).toBe(403);
  });

  test("volunteer can access delivery route", async () => {
    const response = await access(
      "volunteer",
      accounts.volunteer.token
    );

    expect(response.status).toBe(200);
  });

  test("volunteer cannot access admin route", async () => {
    const response = await access(
      "admin",
      accounts.volunteer.token
    );

    expect(response.status).toBe(403);
  });

  test("admin permissions use current DB role", async () => {
    try {
      await pool.query(
        `UPDATE users SET role = 'admin'
         WHERE id = $1`,
        [accounts.donor.user.id]
      );

      const response = await access(
        "admin",
        accounts.donor.token
      );

      expect(response.status).toBe(200);
    } finally {
      await pool.query(
        `UPDATE users SET role = 'donor'
         WHERE id = $1`,
        [accounts.donor.user.id]
      );
    }
  });

  test("unauthenticated RBAC route returns 401", async () => {
    const response = await request(app)
      .get(`${BASE}/access/admin`);

    expect(response.status).toBe(401);
  });
});




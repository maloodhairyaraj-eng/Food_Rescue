
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureOrgTestPass123!";

const createdUserIds = [];
let ngoToken;
let otherToken;
let ngoOrganizationId;

async function createAccount(role) {
  const email =
    `org-${role}-${crypto.randomUUID()}@example.com`;

  const registration = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Organization Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registration.status).toBe(201);

  createdUserIds.push(
    registration.body.data.user.id
  );

  const login = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(login.status).toBe(200);

  return login.body.data.accessToken;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

const validOrganization = {
  name: "Integration Test NGO",
  organizationType: "ngo",
  description: "Test food distribution",
  contactPhone: "9876543210",
  address: "Jaipur, Rajasthan",
  location: {
    latitude: 26.9124,
    longitude: 75.7873,
  },
};

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

  ngoToken = await createAccount("ngo");
  otherToken = await createAccount("donor");
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      // Delete dependent organizations before users.
      await pool.query(
        `DELETE FROM organizations
         WHERE owner_user_id = ANY($1::uuid[])`,
        [createdUserIds]
      );

      await pool.query(
        `DELETE FROM users
         WHERE id = ANY($1::uuid[])`,
        [createdUserIds]
      );
    }
  } finally {
    await pool.end();
  }
});

describe("Organization API", () => {
  test("rejects unauthenticated creation", async () => {
    const res = await request(app)
      .post(`${BASE}/organizations`)
      .send(validOrganization);

    expect(res.status).toBe(401);
  });

  test("creates an NGO organization", async () => {
    const res = await request(app)
      .post(`${BASE}/organizations`)
      .set(auth(ngoToken))
      .send(validOrganization);

    expect(res.status).toBe(201);
    expect(res.body.data.organization.organizationType)
      .toBe("ngo");

    ngoOrganizationId =
      res.body.data.organization.id;
  });

  test("stores correct PostGIS coordinates", async () => {
    const res = await pool.query(
      `
      SELECT
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
      FROM organizations
      WHERE id = $1
      `,
      [ngoOrganizationId]
    );

    expect(Number(res.rows[0].latitude))
      .toBeCloseTo(26.9124, 4);

    expect(Number(res.rows[0].longitude))
      .toBeCloseTo(75.7873, 4);
  });

  test("returns my organization", async () => {
    const res = await request(app)
      .get(`${BASE}/organizations/me`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(res.body.data.organization.id)
      .toBe(ngoOrganizationId);
  });

  test("returns organization by ID", async () => {
    const res = await request(app)
      .get(
        `${BASE}/organizations/${ngoOrganizationId}`
      )
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
  });

  test("rejects duplicate organization creation", async () => {
    const res = await request(app)
      .post(`${BASE}/organizations`)
      .set(auth(ngoToken))
      .send(validOrganization);

    expect(res.status).toBe(409);
  });

  test("owner can update organization", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/organizations/${ngoOrganizationId}`
      )
      .set(auth(ngoToken))
      .send({
        name: "Updated Integration NGO",
        location: {
          latitude: 26.915,
          longitude: 75.79,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.organization.name)
      .toBe("Updated Integration NGO");

    expect(res.body.data.organization.location.latitude)
      .toBeCloseTo(26.915, 4);
  });

  test("rejects forbidden field updates", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/organizations/${ngoOrganizationId}`
      )
      .set(auth(ngoToken))
      .send({ isVerified: true });

    expect(res.status).toBe(400);
  });

  test("rejects invalid coordinates", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/organizations/${ngoOrganizationId}`
      )
      .set(auth(ngoToken))
      .send({
        location: {
          latitude: 150,
          longitude: 75.79,
        },
      });

    expect(res.status).toBe(400);
  });

  test("another owner cannot update organization", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/organizations/${ngoOrganizationId}`
      )
      .set(auth(otherToken))
      .send({
        name: "Unauthorized Update",
      });

    expect(res.status).toBe(404);
  });

  test("missing organization returns 404", async () => {
    const missingId = crypto.randomUUID();

    const res = await request(app)
      .get(`${BASE}/organizations/${missingId}`)
      .set(auth(ngoToken));

    expect(res.status).toBe(404);
  });

  test("invalid organization UUID returns 400", async () => {
    const res = await request(app)
      .get(`${BASE}/organizations/not-a-uuid`)
      .set(auth(ngoToken));

    expect(res.status).toBe(400);
  });
});

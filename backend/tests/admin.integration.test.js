
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureAdminTestPass123!";

let adminId;
let ngoId;
let organizationId;
let adminToken;
let ngoToken;

function uniqueEmail(role) {
  return `${role}-${crypto.randomUUID()}@example.com`;
}

async function register(role) {
  const email = uniqueEmail(role);

  const response = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Admin Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(response.status).toBe(201);

  return {
    id: response.body.data.user.id,
    email,
  };
}

async function login(email) {
  const response = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(response.status).toBe(200);

  return response.body.data.accessToken;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

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

  const admin = await register("donor");
  adminId = admin.id;

  await pool.query(
    "UPDATE users SET role = 'admin' WHERE id = $1",
    [adminId]
  );

  adminToken = await login(admin.email);

  const ngo = await register("ngo");
  ngoId = ngo.id;
  ngoToken = await login(ngo.email);

  const organization = await request(app)
    .post(`${BASE}/organizations`)
    .set(auth(ngoToken))
    .send({
      name: "Verification Test NGO",
      organizationType: "ngo",
      address: "Jaipur, Rajasthan",
      location: {
        latitude: 26.9124,
        longitude: 75.7873,
      },
    });

  expect(organization.status).toBe(201);

  organizationId =
    organization.body.data.organization.id;
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      if (organizationId) {
        await pool.query(
          "DELETE FROM organizations WHERE id = $1",
          [organizationId]
        );
      }

      for (const id of [ngoId, adminId]) {
        if (id) {
          await pool.query(
            "DELETE FROM users WHERE id = $1",
            [id]
          );
        }
      }
    }
  } finally {
    await pool.end();
  }
});

describe("Admin organization verification", () => {
  test("rejects unauthenticated admin access", async () => {
    const res = await request(app)
      .get(`${BASE}/admin/organizations`);

    expect(res.status).toBe(401);
  });

  test("rejects NGO admin access", async () => {
    const res = await request(app)
      .get(`${BASE}/admin/organizations`)
      .set(auth(ngoToken));

    expect(res.status).toBe(403);
  });

  test("admin can list pending organizations", async () => {
    const res = await request(app)
      .get(`${BASE}/admin/organizations?status=pending`)
      .set(auth(adminToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.organizations))
      .toBe(true);
  });

  test("rejects invalid status filter", async () => {
    const res = await request(app)
      .get(`${BASE}/admin/organizations?status=invalid`)
      .set(auth(adminToken));

    expect(res.status).toBe(400);
  });

  test("admin can approve organization", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/admin/organizations/${organizationId}/verification`
      )
      .set(auth(adminToken))
      .send({ status: "approved" });

    expect(res.status).toBe(200);
    expect(res.body.data.organization.isVerified)
      .toBe(true);
    expect(res.body.data.organization.verificationStatus)
      .toBe("approved");
  });

  test("approval persists in PostgreSQL", async () => {
    const res = await pool.query(
      `
      SELECT verification_status, is_verified, verified_by
      FROM organizations
      WHERE id = $1
      `,
      [organizationId]
    );

    expect(res.rows[0].verification_status)
      .toBe("approved");
    expect(res.rows[0].is_verified).toBe(true);
    expect(res.rows[0].verified_by).toBe(adminId);
  });

  test("admin can reject with reason", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/admin/organizations/${organizationId}/verification`
      )
      .set(auth(adminToken))
      .send({
        status: "rejected",
        reason: "Missing verification documents",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.organization.isVerified)
      .toBe(false);
    expect(res.body.data.organization.rejectionReason)
      .toBe("Missing verification documents");
  });

  test("rejects rejection without reason", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/admin/organizations/${organizationId}/verification`
      )
      .set(auth(adminToken))
      .send({ status: "rejected" });

    expect(res.status).toBe(400);
  });

  test("NGO cannot approve organization", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/admin/organizations/${organizationId}/verification`
      )
      .set(auth(ngoToken))
      .send({ status: "approved" });

    expect(res.status).toBe(403);
  });

  test("invalid organization UUID rejected", async () => {
    const res = await request(app)
      .patch(
        `${BASE}/admin/organizations/not-a-uuid/verification`
      )
      .set(auth(adminToken))
      .send({ status: "approved" });

    expect(res.status).toBe(400);
  });
});


const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureContractPass123!";

const userIds = [];
let ngoToken;
let donorToken;
let adminToken;
let organizationId;

async function createAccount(role) {
  const email =
    `contract-${role}-${crypto.randomUUID()}@example.com`;

  const registration = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Contract Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registration.status).toBe(201);

  const id = registration.body.data.user.id;
  userIds.push(id);

  return { id, email };
}

async function login(email) {
  const response = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(response.status).toBe(200);

  return response.body.data.accessToken;
}

function bearer(token) {
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
    throw new Error("Wrong test database");
  }

  const ngo = await createAccount("ngo");
  const donor = await createAccount("donor");
  const admin = await createAccount("donor");

  await pool.query(
    "UPDATE users SET role = 'admin' WHERE id = $1",
    [admin.id]
  );

  ngoToken = await login(ngo.email);
  donorToken = await login(donor.email);
  adminToken = await login(admin.email);

  const created = await request(app)
    .post(`${BASE}/organizations`)
    .set(bearer(ngoToken))
    .send({
      name: "Contract Test NGO",
      organizationType: "ngo",
      address: "Jaipur, Rajasthan",
      location: {
        latitude: 26.9124,
        longitude: 75.7873,
      },
    });

  expect(created.status).toBe(201);
  organizationId = created.body.data.organization.id;

  const rejected = await request(app)
    .patch(
      `${BASE}/admin/organizations/${organizationId}/verification`
    )
    .set(bearer(adminToken))
    .send({
      status: "rejected",
      reason: "Missing registration documents",
    });

  expect(rejected.status).toBe(200);
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

      if (userIds.length) {
        await pool.query(
          "DELETE FROM users WHERE id = ANY($1::uuid[])",
          [userIds]
        );
      }
    }
  } finally {
    await pool.end();
  }
});

describe("Organization frontend contracts", () => {
  test("owner sees verification details", async () => {
    const response = await request(app)
      .get(`${BASE}/organizations/me`)
      .set(bearer(ngoToken));

    expect(response.status).toBe(200);

    const org = response.body.data.organization;

    expect(org.verificationStatus).toBe("rejected");
    expect(org.isVerified).toBe(false);
    expect(org.rejectionReason)
      .toBe("Missing registration documents");
    expect(org.verifiedAt).toBeTruthy();
  });

  test("unrelated user cannot see rejection reason", async () => {
    const response = await request(app)
      .get(`${BASE}/organizations/${organizationId}`)
      .set(bearer(donorToken));

    expect(response.status).toBe(200);

    const org = response.body.data.organization;

    expect(org.verificationStatus).toBe("rejected");
    expect(org.rejectionReason).toBeUndefined();
    expect(org.verifiedBy).toBeUndefined();
    expect(org.verifiedAt).toBeUndefined();
  });

  test("admin can see verification details", async () => {
    const response = await request(app)
      .get(`${BASE}/organizations/${organizationId}`)
      .set(bearer(adminToken));

    expect(response.status).toBe(200);

    const org = response.body.data.organization;

    expect(org.rejectionReason)
      .toBe("Missing registration documents");
    expect(org.verifiedBy).toBeTruthy();
  });

  test("organization fields use camelCase", async () => {
    const response = await request(app)
      .get(`${BASE}/organizations/me`)
      .set(bearer(ngoToken));

    expect(response.status).toBe(200);

    const org = response.body.data.organization;

    expect(org).toHaveProperty("ownerUserId");
    expect(org).toHaveProperty("organizationType");
    expect(org).toHaveProperty("contactPhone");
    expect(org).toHaveProperty("verificationStatus");
    expect(org).toHaveProperty("createdAt");
    expect(org).toHaveProperty("updatedAt");

    expect(org.owner_user_id).toBeUndefined();
    expect(org.organization_type).toBeUndefined();
    expect(org.verification_status).toBeUndefined();
  });

  test("approved organization clears rejection reason", async () => {
    const approved = await request(app)
      .patch(
        `${BASE}/admin/organizations/${organizationId}/verification`
      )
      .set(bearer(adminToken))
      .send({ status: "approved" });

    expect(approved.status).toBe(200);

    const org = approved.body.data.organization;

    expect(org.verificationStatus).toBe("approved");
    expect(org.isVerified).toBe(true);
    expect(org.rejectionReason).toBeNull();

    const ownerResponse = await request(app)
      .get(`${BASE}/organizations/me`)
      .set(bearer(ngoToken));

    expect(ownerResponse.body.data.organization.isVerified)
      .toBe(true);
  });
});

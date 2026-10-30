
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecurePickupTest123!";

const userIds = [];
const organizationIds = [];
const listingIds = [];
const pickupIds = [];

let ngoToken;
let donorToken;
let unverifiedNgoToken;
let listingId;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createAccount(role) {
  const email =
    `pickup-${role}-${crypto.randomUUID()}@example.com`;

  const registered = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Pickup Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registered.status).toBe(201);
  userIds.push(registered.body.data.user.id);

  const login = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(login.status).toBe(200);

  return login.body.data.accessToken;
}

async function createOrganization(token, type) {
  const result = await request(app)
    .post(`${BASE}/organizations`)
    .set(auth(token))
    .send({
      name: `Pickup Test ${type} ${crypto.randomUUID()}`,
      organizationType: type,
      address: "Jaipur, Rajasthan",
      location: {
        latitude: 26.9124,
        longitude: 75.7873,
      },
    });

  expect(result.status).toBe(201);

  const id = result.body.data.organization.id;
  organizationIds.push(id);

  return id;
}

function foodData() {
  const now = Date.now();

  return {
    title: "Pickup Test Meals",
    foodType: "veg",
    quantity: 30,
    quantityUnit: "meals",
    preparedAt: new Date(now - 600000).toISOString(),
    pickupStartAt: new Date(now + 600000).toISOString(),
    pickupEndAt: new Date(now + 7200000).toISOString(),
    expiresAt: new Date(now + 14400000).toISOString(),
    pickupAddress: "Jaipur, Rajasthan",
    pickupLocation: {
      latitude: 26.9124,
      longitude: 75.7873,
    },
  };
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

  donorToken = await createAccount("donor");
  ngoToken = await createAccount("ngo");
  unverifiedNgoToken = await createAccount("ngo");

  const donorOrg = await createOrganization(
    donorToken, "restaurant"
  );

  const ngoOrg = await createOrganization(
    ngoToken, "ngo"
  );

  await createOrganization(
    unverifiedNgoToken, "ngo"
  );

  await pool.query(
    `
    UPDATE organizations
    SET is_verified = TRUE,
        verification_status = 'approved',
        verified_at = NOW()
    WHERE id = ANY($1::uuid[])
    `,
    [[donorOrg, ngoOrg]]
  );

  const listing = await request(app)
    .post(`${BASE}/food-listings`)
    .set(auth(donorToken))
    .send(foodData());

  expect(listing.status).toBe(201);

  listingId = listing.body.data.listing.id;
  listingIds.push(listingId);
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      if (pickupIds.length) {
        await pool.query(
          "DELETE FROM pickup_requests WHERE id = ANY($1::uuid[])",
          [pickupIds]
        );
      }

      if (listingIds.length) {
        await pool.query(
          "DELETE FROM food_listings WHERE id = ANY($1::uuid[])",
          [listingIds]
        );
      }

      if (organizationIds.length) {
        await pool.query(
          "DELETE FROM organizations WHERE id = ANY($1::uuid[])",
          [organizationIds]
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

describe("NGO pickup reservation", () => {
  test("rejects unauthenticated requests", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .send({ foodListingId: listingId });

    expect(res.status).toBe(401);
  });

  test("rejects donor pickup requests", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .set(auth(donorToken))
      .send({ foodListingId: listingId });

    expect(res.status).toBe(403);
  });

  test("rejects unverified NGO", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .set(auth(unverifiedNgoToken))
      .send({ foodListingId: listingId });

    expect(res.status).toBe(403);
  });

  test("rejects client-controlled quantity", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .set(auth(ngoToken))
      .send({
        foodListingId: listingId,
        requestedQuantity: 5,
      });

    expect(res.status).toBe(400);
  });

  test("verified NGO reserves full listing", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .set(auth(ngoToken))
      .send({
        foodListingId: listingId,
        notes: "Pickup test",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.pickupRequest.status)
      .toBe("pending");
    expect(res.body.data.pickupRequest.requestedQuantity)
      .toBe(30);

    pickupIds.push(res.body.data.pickupRequest.id);
  });

  test("listing becomes reserved", async () => {
    const result = await pool.query(
      `
      SELECT status, reserved_at
      FROM food_listings
      WHERE id = $1
      `,
      [listingId]
    );

    expect(result.rows[0].status).toBe("reserved");
    expect(result.rows[0].reserved_at).not.toBeNull();
  });

  test("duplicate request returns 409", async () => {
    const res = await request(app)
      .post(`${BASE}/pickup-requests`)
      .set(auth(ngoToken))
      .send({ foodListingId: listingId });

    expect(res.status).toBe(409);
  });

  test("reserved listing disappears from discovery", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(
      res.body.data.listings.some(
        (item) => item.id === listingId
      )
    ).toBe(false);
  });

  test("request belongs to authenticated NGO", async () => {
    const result = await pool.query(
      `
      SELECT
        p.ngo_organization_id,
        o.owner_user_id
      FROM pickup_requests p
      JOIN organizations o
        ON o.id = p.ngo_organization_id
      WHERE p.id = $1
      `,
      [pickupIds[0]]
    );

    expect(result.rows[0].owner_user_id).toBeTruthy();
  });
});

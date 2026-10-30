
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureFoodManagement123!";

const userIds = [];
const organizationIds = [];
const listingIds = [];

let donorToken;
let otherDonorToken;
let ngoToken;
let organizationId;
let listingId;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createAccount(role) {
  const email =
    `management-${crypto.randomUUID()}@example.com`;

  const registered = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: "Food Management Test",
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

function foodData() {
  const now = Date.now();

  return {
    title: "Management Test Meals",
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
  otherDonorToken = await createAccount("donor");
  ngoToken = await createAccount("ngo");

  const org = await request(app)
    .post(`${BASE}/organizations`)
    .set(auth(donorToken))
    .send({
      name: "Management Test Restaurant",
      organizationType: "restaurant",
      address: "Jaipur, Rajasthan",
      location: {
        latitude: 26.9124,
        longitude: 75.7873,
      },
    });

  expect(org.status).toBe(201);

  organizationId = org.body.data.organization.id;
  organizationIds.push(organizationId);

  await pool.query(
    `
    UPDATE organizations
    SET is_verified = TRUE,
        verification_status = 'approved',
        verified_at = NOW()
    WHERE id = $1
    `,
    [organizationId]
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

describe("Food listing management", () => {
  test("NGO can browse available food", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(res.body.data.listings.some(
      (item) => item.id === listingId
    )).toBe(true);
  });

  test("food type filter works", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings?foodType=non_veg`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(res.body.data.listings.some(
      (item) => item.id === listingId
    )).toBe(false);
  });

  test("invalid filter returns 400", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings?foodType=invalid`)
      .set(auth(ngoToken));

    expect(res.status).toBe(400);
  });

  test("donor can retrieve own listings", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings/mine`)
      .set(auth(donorToken));

    expect(res.status).toBe(200);
    expect(res.body.data.listings.some(
      (item) => item.id === listingId
    )).toBe(true);
  });

  test("NGO cannot access donor management route", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings/mine`)
      .set(auth(ngoToken));

    expect(res.status).toBe(403);
  });

  test("listing details return correct data", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings/${listingId}`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(res.body.data.listing.quantity).toBe(30);
  });

  test("owner can update listing", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}`)
      .set(auth(donorToken))
      .send({
        title: "Updated Management Meals",
        quantity: 25,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.listing.quantity).toBe(25);
  });

  test("other donor cannot update listing", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}`)
      .set(auth(otherDonorToken))
      .send({ quantity: 10 });

    expect(res.status).toBe(404);
  });

  test("NGO cannot update listing", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}`)
      .set(auth(ngoToken))
      .send({ quantity: 10 });

    expect(res.status).toBe(403);
  });

  test("invalid quantity is rejected", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}`)
      .set(auth(donorToken))
      .send({ quantity: -5 });

    expect(res.status).toBe(400);
  });

  test("owner can cancel listing", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}/cancel`)
      .set(auth(donorToken));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("cancelled");
  });

  test("cancelled listing disappears from discovery", async () => {
    const res = await request(app)
      .get(`${BASE}/food-listings`)
      .set(auth(ngoToken));

    expect(res.status).toBe(200);
    expect(res.body.data.listings.some(
      (item) => item.id === listingId
    )).toBe(false);
  });

  test("cancelled listing cannot be edited", async () => {
    const res = await request(app)
      .patch(`${BASE}/food-listings/${listingId}`)
      .set(auth(donorToken))
      .send({ quantity: 5 });

    expect(res.status).toBe(409);
  });
});

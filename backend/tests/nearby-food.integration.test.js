
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureNearbyTest123!";

const userIds = [];
const organizationIds = [];
const listingIds = [];

let ngoToken;
let donorToken;
let volunteerToken;

let nearListingId;
let farListingId;
let cancelledListingId;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createAccount(role) {
  const email =
    `nearby-${role}-${crypto.randomUUID()}@example.com`;

  const registered = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Nearby Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registered.status).toBe(201);

  const userId = registered.body.data.user.id;
  userIds.push(userId);

  const login = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(login.status).toBe(200);

  return login.body.data.accessToken;
}

async function createOrganization(token, type, location) {
  const response = await request(app)
    .post(`${BASE}/organizations`)
    .set(auth(token))
    .send({
      name: `Nearby ${type} ${crypto.randomUUID()}`,
      organizationType: type,
      address: "Jaipur, Rajasthan",
      location,
    });

  expect(response.status).toBe(201);

  const id = response.body.data.organization.id;
  organizationIds.push(id);

  await pool.query(
    `
    UPDATE organizations
    SET
      is_verified = TRUE,
      verification_status = 'approved',
      verified_at = NOW()
    WHERE id = $1
    `,
    [id]
  );

  return id;
}

function foodData(title, location) {
  const now = Date.now();

  return {
    title,
    description: "PostGIS nearby discovery test",
    foodType: "veg",
    quantity: 20,
    quantityUnit: "meals",
    preparedAt:
      new Date(now - 600000).toISOString(),
    pickupStartAt:
      new Date(now + 600000).toISOString(),
    pickupEndAt:
      new Date(now + 7200000).toISOString(),
    expiresAt:
      new Date(now + 14400000).toISOString(),
    pickupAddress: "Jaipur, Rajasthan",
    pickupLocation: location,
  };
}

async function createFood(title, location) {
  const response = await request(app)
    .post(`${BASE}/food-listings`)
    .set(auth(donorToken))
    .send(foodData(title, location));

  expect(response.status).toBe(201);

  const id = response.body.data.listing.id;
  listingIds.push(id);

  return id;
}

beforeAll(async () => {
  if (
    process.env.NODE_ENV !== "test" ||
    process.env.DB_NAME !== "zero_waste_test_db"
  ) {
    throw new Error(
      "Unsafe environment: expected zero_waste_test_db"
    );
  }

  const database = await pool.query(
    "SELECT current_database() AS name"
  );

  if (database.rows[0].name !== "zero_waste_test_db") {
    throw new Error("Wrong database connection");
  }

  ngoToken = await createAccount("ngo");
  donorToken = await createAccount("donor");
  volunteerToken = await createAccount("volunteer");

  await createOrganization(
    ngoToken,
    "ngo",
    {
      latitude: 26.9124,
      longitude: 75.7873,
    }
  );

  await createOrganization(
    donorToken,
    "restaurant",
    {
      latitude: 26.9130,
      longitude: 75.7880,
    }
  );

  nearListingId = await createFood(
    "Nearby Test Meals",
    {
      latitude: 26.9130,
      longitude: 75.7880,
    }
  );

  farListingId = await createFood(
    "Faraway Test Meals",
    {
      latitude: 26.9800,
      longitude: 75.9000,
    }
  );

  cancelledListingId = await createFood(
    "Cancelled Nearby Meals",
    {
      latitude: 26.9135,
      longitude: 75.7885,
    }
  );

  const cancelled = await request(app)
    .patch(
      `${BASE}/food-listings/${cancelledListingId}/cancel`
    )
    .set(auth(donorToken));

  expect(cancelled.status).toBe(200);
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      const database = await pool.query(
        "SELECT current_database() AS name"
      );

      if (database.rows[0].name !== "zero_waste_test_db") {
        throw new Error("Unsafe cleanup database");
      }

      if (listingIds.length) {
        await pool.query(
          `
          DELETE FROM food_listings
          WHERE id = ANY($1::uuid[])
          `,
          [listingIds]
        );
      }

      if (organizationIds.length) {
        await pool.query(
          `
          DELETE FROM organizations
          WHERE id = ANY($1::uuid[])
          `,
          [organizationIds]
        );
      }

      if (userIds.length) {
        await pool.query(
          `
          DELETE FROM users
          WHERE id = ANY($1::uuid[])
          `,
          [userIds]
        );
      }
    }
  } finally {
    await pool.end();
  }
});

describe("PostGIS nearby food discovery", () => {
  test("requires authentication", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/nearby`);

    expect(response.status).toBe(401);
  });

  test("rejects non-NGO accounts", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/nearby`)
      .set(auth(donorToken));

    expect(response.status).toBe(403);
  });

  test("rejects volunteer access", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/nearby`)
      .set(auth(volunteerToken));

    expect(response.status).toBe(403);
  });

  test("finds food within 5 km", async () => {
    const response = await request(app)
      .get(
        `${BASE}/food-listings/nearby?radiusKm=5`
      )
      .set(auth(ngoToken));

    expect(response.status).toBe(200);

    const ids = response.body.data.listings.map(
      (listing) => listing.id
    );

    expect(ids).toContain(nearListingId);
    expect(ids).not.toContain(farListingId);
  });

  test("excludes cancelled listings", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/nearby`)
      .set(auth(ngoToken));

    expect(response.status).toBe(200);

    const ids = response.body.data.listings.map(
      (listing) => listing.id
    );

    expect(ids).not.toContain(cancelledListingId);
  });

  test("returns calculated distance", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/nearby`)
      .set(auth(ngoToken));

    const listing = response.body.data.listings.find(
      (item) => item.id === nearListingId
    );

    expect(response.status).toBe(200);
    expect(listing).toBeDefined();
    expect(typeof listing.distanceKm).toBe("number");
    expect(listing.distanceKm).toBeGreaterThanOrEqual(0);
  });

  test("rejects excessive radius", async () => {
    const response = await request(app)
      .get(
        `${BASE}/food-listings/nearby?radiusKm=1000`
      )
      .set(auth(ngoToken));

    expect(response.status).toBe(400);
  });

  test("rejects invalid pagination", async () => {
    const response = await request(app)
      .get(
        `${BASE}/food-listings/nearby?limit=1000`
      )
      .set(auth(ngoToken));

    expect(response.status).toBe(400);
  });

  test("returns pagination metadata", async () => {
    const response = await request(app)
      .get(
        `${BASE}/food-listings/nearby?limit=5&offset=0`
      )
      .set(auth(ngoToken));

    expect(response.status).toBe(200);

    expect(response.body.data.pagination)
      .toEqual({
        total: expect.any(Number),
        limit: 5,
        offset: 0,
      });
  });

  test("rejects unsupported query parameters", async () => {
    const response = await request(app)
      .get(
        `${BASE}/food-listings/nearby?latitude=0`
      )
      .set(auth(ngoToken));

    expect(response.status).toBe(400);
  });
});


const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureMatchingTest123!";

const userIds = [];
const organizationIds = [];
const listingIds = [];

let ngoToken;
let donorToken;
let volunteerToken;
let nearId;
let farId;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createUser(role) {
  const email =
    `matching-${role}-${crypto.randomUUID()}@example.com`;

  const registration = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Matching Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registration.status).toBe(201);

  userIds.push(registration.body.data.user.id);

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
      name: `Matching ${type} ${crypto.randomUUID()}`,
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
    SET is_verified = TRUE,
        verification_status = 'approved',
        verified_at = NOW()
    WHERE id = $1
    `,
    [id]
  );

  return id;
}

function foodData(title, latitude, longitude) {
  const now = Date.now();

  return {
    title,
    description: "Smart matching integration test",
    foodType: "veg",
    quantity: 25,
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
    pickupLocation: {
      latitude,
      longitude,
    },
  };
}

async function createFood(title, latitude, longitude) {
  const response = await request(app)
    .post(`${BASE}/food-listings`)
    .set(auth(donorToken))
    .send(foodData(title, latitude, longitude));

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
    throw new Error("Unsafe test environment");
  }

  const database = await pool.query(
    "SELECT current_database() AS name"
  );

  if (database.rows[0].name !== "zero_waste_test_db") {
    throw new Error("Wrong test database");
  }

  ngoToken = await createUser("ngo");
  donorToken = await createUser("donor");
  volunteerToken = await createUser("volunteer");

  await createOrganization(ngoToken, "ngo", {
    latitude: 26.9124,
    longitude: 75.7873,
  });

  await createOrganization(donorToken, "restaurant", {
    latitude: 26.9130,
    longitude: 75.7880,
  });

  nearId = await createFood(
    "Matching Near Meals",
    26.9130,
    75.7880
  );

  farId = await createFood(
    "Matching Far Meals",
    26.9500,
    75.8200
  );
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      const db = await pool.query(
        "SELECT current_database() AS name"
      );

      if (db.rows[0].name !== "zero_waste_test_db") {
        throw new Error("Unsafe cleanup database");
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

describe("Smart food matching API", () => {
  test("requires authentication", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches`);

    expect(response.status).toBe(401);
  });

  test("rejects donor access", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches`)
      .set(auth(donorToken));

    expect(response.status).toBe(403);
  });

  test("rejects volunteer access", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches`)
      .set(auth(volunteerToken));

    expect(response.status).toBe(403);
  });

  test("returns ranked food listings", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches?radiusKm=10`)
      .set(auth(ngoToken));

    expect(response.status).toBe(200);

    const listings = response.body.data.listings;

    expect(listings.some((item) => item.id === nearId))
      .toBe(true);

    expect(listings.some((item) => item.id === farId))
      .toBe(true);

    for (let i = 1; i < listings.length; i++) {
      expect(listings[i - 1].matchScore)
        .toBeGreaterThanOrEqual(listings[i].matchScore);
    }
  });

  test("returns score breakdown", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches?radiusKm=10`)
      .set(auth(ngoToken));

    expect(response.status).toBe(200);

    const match = response.body.data.listings.find(
      (item) => item.id === nearId
    );

    expect(match).toBeDefined();
    expect(match.matchScore).toEqual(expect.any(Number));
    expect(match.scoreBreakdown).toEqual({
      distance: expect.any(Number),
      urgency: expect.any(Number),
      quantity: expect.any(Number),
      feasibility: expect.any(Number),
    });
  });

  test("returns matching metadata", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches`)
      .set(auth(ngoToken));

    expect(response.status).toBe(200);
    expect(response.body.data.matching.model)
      .toBe("heuristic-v1");
  });

  test("rejects excessive radius", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches?radiusKm=100`)
      .set(auth(ngoToken));

    expect(response.status).toBe(400);
  });

  test("rejects unsupported coordinates", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches?latitude=26.9`)
      .set(auth(ngoToken));

    expect(response.status).toBe(400);
  });

  test("supports pagination", async () => {
    const response = await request(app)
      .get(`${BASE}/food-listings/matches?limit=1&offset=0`)
      .set(auth(ngoToken));

    expect(response.status).toBe(200);
    expect(response.body.data.listings).toHaveLength(1);
    expect(response.body.data.pagination.limit).toBe(1);
  });
});

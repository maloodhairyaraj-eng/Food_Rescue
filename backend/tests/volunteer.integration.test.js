
const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const BASE = "/api/v1";
const PASSWORD = "SecureVolunteerTest123!";

const userIds = [];
const organizationIds = [];
const listingIds = [];
const pickupIds = [];
const assignmentIds = [];

let ngoToken;
let donorToken;
let volunteerToken;
let otherVolunteerToken;
let volunteerUserId;
let pickupId;
let listingId;
let assignmentId;

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function createAccount(role) {
  const email =
    `volunteer-${role}-${crypto.randomUUID()}@example.com`;

  const registration = await request(app)
    .post(`${BASE}/auth/register`)
    .send({
      fullName: `Volunteer Test ${role}`,
      email,
      password: PASSWORD,
      role,
    });

  expect(registration.status).toBe(201);

  const userId = registration.body.data.user.id;
  userIds.push(userId);

  const login = await request(app)
    .post(`${BASE}/auth/login`)
    .send({ email, password: PASSWORD });

  expect(login.status).toBe(200);

  return {
    id: userId,
    token: login.body.data.accessToken,
  };
}

async function createOrganization(token, type) {
  const response = await request(app)
    .post(`${BASE}/organizations`)
    .set(auth(token))
    .send({
      name: `Volunteer Test ${type} ${crypto.randomUUID()}`,
      organizationType: type,
      address: "Jaipur, Rajasthan",
      location: {
        latitude: 26.9124,
        longitude: 75.7873,
      },
    });

  expect(response.status).toBe(201);

  const id = response.body.data.organization.id;
  organizationIds.push(id);

  return id;
}

function foodData() {
  const now = Date.now();

  return {
    title: "Volunteer Test Meals",
    foodType: "veg",
    quantity: 20,
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
    throw new Error("Wrong database");
  }

  const ngo = await createAccount("ngo");
  const donor = await createAccount("donor");
  const volunteer = await createAccount("volunteer");
  const other = await createAccount("volunteer");

  ngoToken = ngo.token;
  donorToken = donor.token;
  volunteerToken = volunteer.token;
  otherVolunteerToken = other.token;
  volunteerUserId = volunteer.id;

  const ngoOrg = await createOrganization(ngoToken, "ngo");
  const donorOrg = await createOrganization(
    donorToken,
    "restaurant"
  );

  await pool.query(
    `UPDATE organizations
     SET is_verified = TRUE,
         verification_status = 'approved'
     WHERE id = ANY($1::uuid[])`,
    [[ngoOrg, donorOrg]]
  );

  const listing = await request(app)
    .post(`${BASE}/food-listings`)
    .set(auth(donorToken))
    .send(foodData());

  expect(listing.status).toBe(201);

  listingId = listing.body.data.listing.id;
  listingIds.push(listingId);

  const pickup = await request(app)
    .post(`${BASE}/pickup-requests`)
    .set(auth(ngoToken))
    .send({ foodListingId: listingId });

  expect(pickup.status).toBe(201);

  pickupId = pickup.body.data.pickupRequest.id;
  pickupIds.push(pickupId);

  const approved = await request(app)
    .patch(`${BASE}/pickup-requests/${pickupId}/approve`)
    .set(auth(donorToken));

  expect(approved.status).toBe(200);
});

afterAll(async () => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.DB_NAME === "zero_waste_test_db"
    ) {
      if (assignmentIds.length) {
        await pool.query(
          "DELETE FROM volunteer_assignments WHERE id = ANY($1::uuid[])",
          [assignmentIds]
        );
      }

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

describe("Volunteer assignment workflow", () => {
  test("NGO can assign volunteer", async () => {
    const response = await request(app)
      .post(`${BASE}/pickup-requests/${pickupId}/assign`)
      .set(auth(ngoToken))
      .send({ volunteerUserId });

    expect(response.status).toBe(201);
    expect(response.body.data.assignment.status)
      .toBe("assigned");

    assignmentId = response.body.data.assignment.id;
    assignmentIds.push(assignmentId);
  });

  test("duplicate assignment rejected", async () => {
    const response = await request(app)
      .post(`${BASE}/pickup-requests/${pickupId}/assign`)
      .set(auth(ngoToken))
      .send({ volunteerUserId });

    expect(response.status).toBe(409);
  });

  test("volunteer sees own assignment", async () => {
    const response = await request(app)
      .get(`${BASE}/volunteer/assignments`)
      .set(auth(volunteerToken));

    expect(response.status).toBe(200);
    expect(
      response.body.data.assignments.some(
        (item) => item.id === assignmentId
      )
    ).toBe(true);
  });

  test("another volunteer cannot view assignment", async () => {
    const response = await request(app)
      .get(`${BASE}/volunteer/assignments/${assignmentId}`)
      .set(auth(otherVolunteerToken));

    expect(response.status).toBe(404);
  });

  test("another volunteer cannot update status", async () => {
    const response = await request(app)
      .patch(`${BASE}/volunteer/assignments/${assignmentId}/status`)
      .set(auth(otherVolunteerToken))
      .send({ status: "picked_up" });

    expect(response.status).toBe(404);
  });

  test("cannot complete before pickup", async () => {
    const response = await request(app)
      .patch(`${BASE}/volunteer/assignments/${assignmentId}/status`)
      .set(auth(volunteerToken))
      .send({ status: "completed" });

    expect(response.status).toBe(409);
  });

  test("assigned volunteer marks food picked up", async () => {
    const response = await request(app)
      .patch(`${BASE}/volunteer/assignments/${assignmentId}/status`)
      .set(auth(volunteerToken))
      .send({ status: "picked_up" });

    expect(response.status).toBe(200);
    expect(response.body.data.assignment.status)
      .toBe("picked_up");
    expect(response.body.data.assignment.listingStatus)
      .toBe("picked_up");
  });

  test("assigned volunteer completes delivery", async () => {
    const response = await request(app)
      .patch(`${BASE}/volunteer/assignments/${assignmentId}/status`)
      .set(auth(volunteerToken))
      .send({ status: "completed" });

    expect(response.status).toBe(200);
    expect(response.body.data.assignment.status)
      .toBe("completed");
    expect(response.body.data.assignment.pickupStatus)
      .toBe("completed");
    expect(response.body.data.assignment.listingStatus)
      .toBe("completed");
  });

  test("repeated completion rejected", async () => {
    const response = await request(app)
      .patch(`${BASE}/volunteer/assignments/${assignmentId}/status`)
      .set(auth(volunteerToken))
      .send({ status: "completed" });

    expect(response.status).toBe(409);
  });

  test("completion persists in PostgreSQL", async () => {
    const result = await pool.query(
      `SELECT
         a.status AS assignment_status,
         p.status AS pickup_status,
         f.status AS listing_status
       FROM volunteer_assignments a
       JOIN pickup_requests p
         ON p.id = a.pickup_request_id
       JOIN food_listings f
         ON f.id = p.food_listing_id
       WHERE a.id = $1`,
      [assignmentId]
    );

    expect(result.rows[0]).toEqual({
      assignment_status: "completed",
      pickup_status: "completed",
      listing_status: "completed",
    });
  });
});


const request = require("supertest");
const crypto = require("node:crypto");

const app = require("../src/app");
const { pool } = require("../src/config/db");

const {
    expireReservations,
} = require("../src/services/reservation-expiry.service");

const BASE = "/api/v1";
const PASSWORD = "SecureExpiryTest123!";

const users = [];
const organizations = [];
const listings = [];
const pickups = [];
const assignments = [];

let donorToken;
let ngoToken;
let volunteerToken;
let volunteerId;

function auth(token) {
    return { Authorization: `Bearer ${token}` };
}

function assertTestDatabase() {
    if (
        process.env.NODE_ENV !== "test" ||
        process.env.DB_NAME !== "zero_waste_test_db"
    ) {
        throw new Error(
            "Refusing to run outside zero_waste_test_db"
        );
    }
}

async function createUser(role) {
    const email =
        `expiry-${role}-${crypto.randomUUID()}@example.com`;

    const registration = await request(app)
        .post(`${BASE}/auth/register`)
        .send({
            fullName: `Expiry Test ${role}`,
            email,
            password: PASSWORD,
            role,
        });

    expect(registration.status).toBe(201);

    const id = registration.body.data.user.id;
    users.push(id);

    const login = await request(app)
        .post(`${BASE}/auth/login`)
        .send({ email, password: PASSWORD });

    expect(login.status).toBe(200);

    return {
        id,
        token: login.body.data.accessToken,
    };
}

async function createOrganization(token, type) {
    const response = await request(app)
        .post(`${BASE}/organizations`)
        .set(auth(token))
        .send({
            name: `Expiry ${type} ${crypto.randomUUID()}`,
            organizationType: type,
            address: "Test pickup location",
            location: {
                latitude: 26.9124,
                longitude: 75.7873,
            },
        });

    expect(response.status).toBe(201);

    const id = response.body.data.organization.id;
    organizations.push(id);

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

function foodData() {
    const now = Date.now();

    return {
        title: `Expiry Test Food ${crypto.randomUUID()}`,
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
        pickupAddress: "Test pickup location",
        pickupLocation: {
            latitude: 26.9124,
            longitude: 75.7873,
        },
    };
}

async function createReservedPickup(options = {}) {
    const listingResponse = await request(app)
        .post(`${BASE}/food-listings`)
        .set(auth(donorToken))
        .send(foodData());

    expect(listingResponse.status).toBe(201);

    const listingId =
        listingResponse.body.data.listing.id;

    listings.push(listingId);

    const pickupResponse = await request(app)
        .post(`${BASE}/pickup-requests`)
        .set(auth(ngoToken))
        .send({ foodListingId: listingId });

    expect(pickupResponse.status).toBe(201);

    const pickupId =
        pickupResponse.body.data.pickupRequest.id;

    pickups.push(pickupId);

    if (options.approved || options.assigned) {
        const approval = await request(app)
            .patch(
                `${BASE}/pickup-requests/${pickupId}/approve`
            )
            .set(auth(donorToken));

        expect(approval.status).toBe(200);
    }

    let assignmentId = null;

    if (options.assigned) {
        const assignment = await request(app)
            .post(
                `${BASE}/pickup-requests/${pickupId}/assign`
            )
            .set(auth(ngoToken))
            .send({ volunteerUserId: volunteerId });

        expect(assignment.status).toBe(201);

        assignmentId = assignment.body.data.assignment.id;
        assignments.push(assignmentId);
    }

    return {
        listingId,
        pickupId,
        assignmentId,
    };
}

// Keep the timeline chronologically valid.
// This changes test records only.
async function makeExpired(listingId) {
    await pool.query(
        `
    UPDATE food_listings
    SET
      prepared_at = NOW() - INTERVAL '4 hours',
      pickup_start_at = NOW() - INTERVAL '3 hours',
      pickup_end_at = NOW() - INTERVAL '1 hour',
      expires_at = NOW() - INTERVAL '30 minutes'
    WHERE id = $1
    `,
        [listingId]
    );
}

async function getStatuses(fixture) {
    const result = await pool.query(
        `
    SELECT
      f.status AS listing_status,
      p.status AS pickup_status,
      a.status AS assignment_status
    FROM food_listings f
    JOIN pickup_requests p
      ON p.food_listing_id = f.id
    LEFT JOIN volunteer_assignments a
      ON a.pickup_request_id = p.id
    WHERE f.id = $1
      AND p.id = $2
    `,
        [fixture.listingId, fixture.pickupId]
    );

    return result.rows[0];
}

beforeAll(async () => {
    assertTestDatabase();

    const db = await pool.query(
        "SELECT current_database() AS name"
    );

    expect(db.rows[0].name)
        .toBe("zero_waste_test_db");

    const donor = await createUser("donor");
    const ngo = await createUser("ngo");
    const volunteer = await createUser("volunteer");

    donorToken = donor.token;
    ngoToken = ngo.token;
    volunteerToken = volunteer.token;
    volunteerId = volunteer.id;

    await createOrganization(
        donorToken,
        "restaurant"
    );

    await createOrganization(
        ngoToken,
        "ngo"
    );
});

afterAll(async () => {
    try {
        assertTestDatabase();

        const db = await pool.query(
            "SELECT current_database() AS name"
        );

        if (db.rows[0].name !== "zero_waste_test_db") {
            throw new Error("Unsafe cleanup database");
        }

        if (assignments.length) {
            await pool.query(
                `DELETE FROM volunteer_assignments
         WHERE id = ANY($1::uuid[])`,
                [assignments]
            );
        }

        if (pickups.length) {
            await pool.query(
                `DELETE FROM pickup_requests
         WHERE id = ANY($1::uuid[])`,
                [pickups]
            );
        }

        if (listings.length) {
            await pool.query(
                `DELETE FROM food_listings
         WHERE id = ANY($1::uuid[])`,
                [listings]
            );
        }

        if (organizations.length) {
            await pool.query(
                `DELETE FROM organizations
         WHERE id = ANY($1::uuid[])`,
                [organizations]
            );
        }

        if (users.length) {
            await pool.query(
                `DELETE FROM users
         WHERE id = ANY($1::uuid[])`,
                [users]
            );
        }
    } finally {
        await pool.end();
    }
});

describe("PostgreSQL reservation expiry", () => {
    test("expires a pending request", async () => {
        const fixture = await createReservedPickup();

        await makeExpired(fixture.listingId);

        const result = await expireReservations();

        expect(result.listingIds)
            .toContain(fixture.listingId);

        const state = await getStatuses(fixture);

        expect(state.listing_status).toBe("expired");
        expect(state.pickup_status).toBe("expired");
    });

    test("expires an approved uncollected request", async () => {
        const fixture = await createReservedPickup({
            approved: true,
        });

        await makeExpired(fixture.listingId);

        await expireReservations();

        const state = await getStatuses(fixture);

        expect(state.listing_status).toBe("expired");
        expect(state.pickup_status).toBe("expired");
    });

    test("expires an assigned but uncollected pickup", async () => {
        const fixture = await createReservedPickup({
            assigned: true,
        });

        await makeExpired(fixture.listingId);

        await expireReservations();

        const state = await getStatuses(fixture);

        expect(state.listing_status).toBe("expired");
        expect(state.pickup_status).toBe("expired");
        expect(state.assignment_status).toBe("expired");
    });

    test("does not expire already collected food", async () => {
        const fixture = await createReservedPickup({
            assigned: true,
        });

        const pickedUp = await request(app)
            .patch(
                `${BASE}/volunteer/assignments/` +
                `${fixture.assignmentId}/status`
            )
            .set(auth(volunteerToken))
            .send({ status: "picked_up" });

        expect(pickedUp.status).toBe(200);

        await makeExpired(fixture.listingId);

        await expireReservations();

        const state = await getStatuses(fixture);

        expect(state.listing_status).toBe("picked_up");
        expect(state.pickup_status).toBe("approved");
        expect(state.assignment_status).toBe("picked_up");
    });

    test("two workers cannot expire the same listing twice", async () => {
        const fixture = await createReservedPickup();

        await makeExpired(fixture.listingId);

        const [first, second] = await Promise.all([
            expireReservations(),
            expireReservations(),
        ]);

        const occurrences = [
            ...first.listingIds,
            ...second.listingIds,
        ].filter((id) => id === fixture.listingId);

        expect(occurrences).toHaveLength(1);

        const state = await getStatuses(fixture);

        expect(state.listing_status).toBe("expired");
        expect(state.pickup_status).toBe("expired");
    });

    test("expiry job is idempotent", async () => {
        const fixture = await createReservedPickup();

        await makeExpired(fixture.listingId);

        await expireReservations();

        const second = await expireReservations();

        expect(second.listingIds)
            .not.toContain(fixture.listingId);
    });


    test("expired reservation cannot be picked up during cleanup", async () => {
        const fixture = await createReservedPickup({
            assigned: true,
        });

        await makeExpired(fixture.listingId);

        const [expiryResult, pickupResult] =
            await Promise.all([
                expireReservations(),

                request(app)
                    .patch(
                        `${BASE}/volunteer/assignments/` +
                        `${fixture.assignmentId}/status`
                    )
                    .set(auth(volunteerToken))
                    .send({ status: "picked_up" }),
            ]);

        expect(expiryResult.listingIds)
            .toContain(fixture.listingId);

        expect(pickupResult.status).toBe(409);

        const state = await getStatuses(fixture);

        expect(state).toEqual({
            listing_status: "expired",
            pickup_status: "expired",
            assignment_status: "expired",
        });
    });


});

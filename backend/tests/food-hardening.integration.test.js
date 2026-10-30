
const request = require("supertest");
const crypto = require("node:crypto");
const { pool } = require("../src/config/db");
const app = require("../src/app");
const { validateFoodTimeline } = require("../src/utils/food-time");

const BASE = "/api/v1";
const PASSWORD = "SecureHardeningPass123!";

let donorId;
let orgId;
let listingId;
let token;

function foodData() {
    const now = Date.now();

    return {
        title: "Hardening Test Meals",
        foodType: "veg",
        quantity: 15,
        quantityUnit: "meals",
        preparedAt: new Date(now - 600000).toISOString(),
        pickupStartAt: new Date(now + 600000).toISOString(),
        pickupEndAt: new Date(now + 3600000).toISOString(),
        expiresAt: new Date(now + 7200000).toISOString(),
        pickupAddress: "Jaipur, Rajasthan",
        pickupLocation: {
            latitude: 26.9124,
            longitude: 75.7873,
        },
    };
}

function auth() {
    return { Authorization: `Bearer ${token}` };
}

beforeAll(async () => {
    if (process.env.NODE_ENV !== "test" ||
        process.env.DB_NAME !== "zero_waste_test_db") {
        throw new Error("Unsafe test environment");
    }

    const db = await pool.query(
        "SELECT current_database() AS name"
    );

    if (db.rows[0].name !== "zero_waste_test_db") {
        throw new Error("Wrong database");
    }

    const email = `hardening-${crypto.randomUUID()}@example.com`;

    const registration = await request(app)
        .post(`${BASE}/auth/register`)
        .send({
            fullName: "Hardening Test Donor",
            email,
            password: PASSWORD,
            role: "donor",
        });

    expect(registration.status).toBe(201);
    donorId = registration.body.data.user.id;

    const login = await request(app)
        .post(`${BASE}/auth/login`)
        .send({ email, password: PASSWORD });

    expect(login.status).toBe(200);
    token = login.body.data.accessToken;

    const organization = await request(app)
        .post(`${BASE}/organizations`)
        .set(auth())
        .send({
            name: "Hardening Test Restaurant",
            organizationType: "restaurant",
            address: "Jaipur, Rajasthan",
            location: {
                latitude: 26.9124,
                longitude: 75.7873,
            },
        });

    expect(organization.status).toBe(201);
    orgId = organization.body.data.organization.id;

    await pool.query(
        `UPDATE organizations
     SET is_verified = TRUE,
         verification_status = 'approved'
     WHERE id = $1`,
        [orgId]
    );
});

afterAll(async () => {
    try {
        if (process.env.NODE_ENV === "test" &&
            process.env.DB_NAME === "zero_waste_test_db") {
            if (listingId) {
                await pool.query(
                    "DELETE FROM food_listings WHERE id = $1",
                    [listingId]
                );
            }
            if (orgId) {
                await pool.query(
                    "DELETE FROM organizations WHERE id = $1",
                    [orgId]
                );
            }
            if (donorId) {
                await pool.query(
                    "DELETE FROM users WHERE id = $1",
                    [donorId]
                );
            }
        }
    } finally {
        await pool.end();
    }
});

describe("Food listing hardening", () => {
    test("rejects timestamps without timezone", async () => {
        const data = foodData();
        data.expiresAt = "2030-01-01T12:00:00";

        const response = await request(app)
            .post(`${BASE}/food-listings`)
            .set(auth())
            .send(data);

        expect(response.status).toBe(400);
    });

    test("rejects invalid pickup timeline", () => {
        const data = foodData();
        data.pickupEndAt = data.pickupStartAt;

        expect(validateFoodTimeline(data)).not.toBeNull();
    });

    test("verified donor creates listing", async () => {
        const response = await request(app)
            .post(`${BASE}/food-listings`)
            .set(auth())
            .send(foodData());

        expect(response.status).toBe(201);
        listingId = response.body.data.listing.id;
    });

    test("rejects creation after verification revocation", async () => {
        await pool.query(
            `UPDATE organizations
       SET is_verified = FALSE,
           verification_status = 'rejected',
           rejection_reason = 'Verification revoked'
       WHERE id = $1`,
            [orgId]
        );

        const response = await request(app)
            .post(`${BASE}/food-listings`)
            .set(auth())
            .send(foodData());

        expect(response.status).toBe(403);
    });

    test("revoked donor listing is hidden from discovery", async () => {
        const response = await request(app)
            .get(`${BASE}/food-listings`)
            .set(auth());

        expect(response.status).toBe(200);
        expect(
            response.body.data.listings.some(
                (item) => item.id === listingId
            )
        ).toBe(false);
    });

    test("expired available listing is hidden", async () => {
        await pool.query(
            `UPDATE organizations
       SET is_verified = TRUE,
           verification_status = 'approved',
           rejection_reason = NULL
       WHERE id = $1`,
            [orgId]
        );


        await pool.query(
            `
            UPDATE food_listings
            SET
                prepared_at = NOW() - INTERVAL '3 hours',
                pickup_start_at = NOW() - INTERVAL '2 hours',
                pickup_end_at = NOW() - INTERVAL '1 hour',
                expires_at = NOW() - INTERVAL '30 minutes'
            WHERE id = $1
            `,
            [listingId]
        );


        const response = await request(app)
            .get(`${BASE}/food-listings`)
            .set(auth());

        expect(response.status).toBe(200);
        expect(
            response.body.data.listings.some(
                (item) => item.id === listingId
            )
        ).toBe(false);
    });

    test("expiry maintenance changes status", async () => {
        const result = await pool.query(
            `UPDATE food_listings
       SET status = 'expired'
       WHERE id = $1
         AND status = 'available'
         AND (expires_at <= NOW()
              OR pickup_end_at <= NOW())
       RETURNING status`,
            [listingId]
        );

        expect(result.rowCount).toBe(1);
        expect(result.rows[0].status).toBe("expired");
    });

    test("expired listing cannot be updated", async () => {
        const response = await request(app)
            .patch(`${BASE}/food-listings/${listingId}`)
            .set(auth())
            .send({ quantity: 10 });

        expect(response.status).toBe(409);
    });
});

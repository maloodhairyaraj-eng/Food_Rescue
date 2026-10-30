
const { pool } = require("../config/db");
const { validateFoodTimeline } = require("../utils/food-time");
const {
    isApprovalRequired,
    canOrganizationParticipate,
    sqlEligibilityCondition,
} = require("../utils/organization-eligibility");

const DONOR_TYPES = [
    "restaurant", "hostel", "caterer", "other_donor",
];

const FOOD_SELECT = `
  f.id, f.donor_organization_id, f.title,
  f.description, f.food_type, f.quantity,
  f.quantity_unit, f.prepared_at, f.expires_at,
  f.pickup_start_at, f.pickup_end_at,
  f.pickup_address, f.status,
  ST_Y(f.pickup_location::geometry) AS latitude,
  ST_X(f.pickup_location::geometry) AS longitude,
  f.created_at, f.updated_at,
  o.name AS donor_name
`;

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function formatFoodListing(row) {
    return {
        id: row.id,
        donorOrganizationId: row.donor_organization_id,
        donorName: row.donor_name,
        title: row.title,
        description: row.description,
        foodType: row.food_type,
        quantity: row.quantity,
        quantityUnit: row.quantity_unit,
        preparedAt: row.prepared_at,
        expiresAt: row.expires_at,
        pickupStartAt: row.pickup_start_at,
        pickupEndAt: row.pickup_end_at,
        pickupAddress: row.pickup_address,
        pickupLocation: {
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
        },
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function iso(value) {
    return value == null
        ? null
        : value instanceof Date
            ? value.toISOString()
            : value;
}

async function getOwnedOrganization(userId) {
    const result = await pool.query(
        `SELECT id, organization_type, is_verified,
            verification_status
     FROM organizations
     WHERE owner_user_id = $1 LIMIT 1`,
        [userId]
    );
    return result.rows[0] || null;
}

// CREATE: verification check and insertion share
// one transaction and an organization row lock.
async function createFoodListing(user, data) {
    if (user.role !== "donor") {
        throw httpError(403, "Only donors can create listings");
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
        await client.query("BEGIN");
        inTransaction = true;

        const orgResult = await client.query(
            `SELECT id, organization_type, is_verified,
              verification_status
       FROM organizations
       WHERE owner_user_id = $1
       FOR UPDATE`,
            [user.id]
        );

        const org = orgResult.rows[0];

        if (!org || !DONOR_TYPES.includes(org.organization_type)) {
            throw httpError(403, "Valid donor organization required");
        }

        if (!canOrganizationParticipate(org)) {
            throw httpError(
                403,
                "Donor organization is not eligible"
            );
        }

        const timelineError = validateFoodTimeline(data);
        if (timelineError) {
            throw httpError(400, timelineError);
        }

        const result = await client.query(
            `
      WITH inserted AS (
        INSERT INTO food_listings (
          donor_organization_id, title, description,
          food_type, quantity, quantity_unit,
          prepared_at, expires_at, pickup_start_at,
          pickup_end_at, pickup_address, pickup_location
        )
        VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          ST_SetSRID(ST_MakePoint($12, $13),4326)::geography
        )
        RETURNING *
      )
      SELECT ${FOOD_SELECT}
      FROM inserted f
      JOIN organizations o ON o.id = f.donor_organization_id
      `,
            [
                org.id, data.title, data.description ?? null,
                data.foodType, data.quantity,
                data.quantityUnit || "meals",
                data.preparedAt ?? null, data.expiresAt,
                data.pickupStartAt, data.pickupEndAt,
                data.pickupAddress,
                Number(data.pickupLocation.longitude),
                Number(data.pickupLocation.latitude),
            ]
        );

        await client.query("COMMIT");
        inTransaction = false;
        return formatFoodListing(result.rows[0]);
    } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

// DISCOVERY: always filter by effective availability,
// regardless of maintenance-job execution.
async function listFoodListings(filters = {}) {
    const values = [isApprovalRequired()];
    const conditions = [
        "f.status = 'available'",
        "f.expires_at > NOW()",
        "f.pickup_end_at > NOW()",
        sqlEligibilityCondition("o", 1),
    ];

    if (filters.foodType) {
        values.push(filters.foodType);
        conditions.push(`f.food_type = $${values.length}`);
    }

    const where = conditions.join(" AND ");
    const limit = Number(filters.limit) || 20;
    const offset = Number(filters.offset) || 0;

    const countResult = await pool.query(
        `SELECT COUNT(*)::integer AS total
     FROM food_listings f
     JOIN organizations o ON o.id = f.donor_organization_id
     WHERE ${where}`,
        values
    );

    const result = await pool.query(
        `SELECT ${FOOD_SELECT}
     FROM food_listings f
     JOIN organizations o ON o.id = f.donor_organization_id
     WHERE ${where}
     ORDER BY f.expires_at ASC, f.id ASC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}`,
        [...values, limit, offset]
    );

    return {
        listings: result.rows.map(formatFoodListing),
        pagination: {
            total: countResult.rows[0].total,
            limit,
            offset,
        },
    };
}

async function getMyFoodListings(user) {
    if (user.role !== "donor" && user.role !== "admin") {
        throw httpError(403, "Only donors can access their listings");
    }

    const org = await getOwnedOrganization(user.id);
    if (!org) return { listings: [] };

    const result = await pool.query(
        `SELECT ${FOOD_SELECT}
     FROM food_listings f
     JOIN organizations o ON o.id = f.donor_organization_id
     WHERE f.donor_organization_id = $1
     ORDER BY f.created_at DESC`,
        [org.id]
    );

    return { listings: result.rows.map(formatFoodListing) };
}

async function getFoodListingById(id, user) {
    const result = await pool.query(
        `SELECT ${FOOD_SELECT},
            o.owner_user_id,
            o.is_verified AS donor_is_verified,
            o.verification_status AS donor_verification_status
     FROM food_listings f
     JOIN organizations o ON o.id = f.donor_organization_id
     WHERE f.id = $1 LIMIT 1`,
        [id]
    );

    if (!result.rowCount) {
        throw httpError(404, "Food listing not found");
    }

    const row = result.rows[0];
    const isOwner = row.owner_user_id === user.id;
    const isAdmin = user.role === "admin";

    const available =
        row.status === "available" &&
        canOrganizationParticipate({
            is_verified: row.donor_is_verified,
            verification_status: row.donor_verification_status,
        }) &&
        new Date(row.expires_at).getTime() > Date.now() &&
        new Date(row.pickup_end_at).getTime() > Date.now();

    if (!isOwner && !isAdmin && !available) {
        throw httpError(404, "Food listing not found");
    }

    return formatFoodListing(row);
}

async function updateFoodListing(id, user, data) {
    const client = await pool.connect();
    let inTransaction = false;

    try {
        await client.query("BEGIN");
        inTransaction = true;

        const existing = await client.query(
            `SELECT f.*, o.owner_user_id,
              o.is_verified, o.verification_status
       FROM food_listings f
       JOIN organizations o ON o.id = f.donor_organization_id
       WHERE f.id = $1
       FOR UPDATE OF f, o`,
            [id]
        );

        if (!existing.rowCount) {
            throw httpError(404, "Food listing not found");
        }

        const current = existing.rows[0];

        if (!canOrganizationParticipate(current)) {
            throw httpError(
                403,
                "Donor organization is not eligible"
            );
        }

        if (current.owner_user_id !== user.id &&
            user.role !== "admin") {
            throw httpError(404, "Food listing not found");
        }

        if (current.status !== "available" ||
            new Date(current.expires_at).getTime() <= Date.now() ||
            new Date(current.pickup_end_at).getTime() <= Date.now()) {
            throw httpError(409, "Listing is no longer editable");
        }

        if (!canOrganizationParticipate(current)) {
            throw httpError(
                403,
                "Donor organization is not eligible"
            );
        }

        const merged = {
            title: data.title ?? current.title,
            description: data.description !== undefined
                ? data.description : current.description,
            quantity: data.quantity ?? current.quantity,
            quantityUnit: data.quantityUnit ?? current.quantity_unit,
            preparedAt: data.preparedAt !== undefined
                ? data.preparedAt : iso(current.prepared_at),
            expiresAt: data.expiresAt ?? iso(current.expires_at),
            pickupStartAt: data.pickupStartAt ?? iso(current.pickup_start_at),
            pickupEndAt: data.pickupEndAt ?? iso(current.pickup_end_at),
            pickupAddress: data.pickupAddress ?? current.pickup_address,
        };

        const timelineError = validateFoodTimeline(merged, {
            requireFuturePickupStart:
                Object.prototype.hasOwnProperty.call(data, "pickupStartAt"),
        });

        if (timelineError) throw httpError(400, timelineError);

        const latitude = data.pickupLocation?.latitude ?? null;
        const longitude = data.pickupLocation?.longitude ?? null;

        await client.query(
            `UPDATE food_listings SET
         title = $1, description = $2, quantity = $3,
         quantity_unit = $4, prepared_at = $5,
         expires_at = $6, pickup_start_at = $7,
         pickup_end_at = $8, pickup_address = $9,
         pickup_location = CASE
           WHEN $10::double precision IS NULL
             THEN pickup_location
           ELSE ST_SetSRID(
             ST_MakePoint(
               $11::double precision,
               $10::double precision
             ),4326
           )::geography
         END
       WHERE id = $12`,
            [
                merged.title, merged.description, merged.quantity,
                merged.quantityUnit, merged.preparedAt,
                merged.expiresAt, merged.pickupStartAt,
                merged.pickupEndAt, merged.pickupAddress,
                latitude, longitude, id,
            ]
        );

        const result = await client.query(
            `SELECT ${FOOD_SELECT}
       FROM food_listings f
       JOIN organizations o ON o.id = f.donor_organization_id
       WHERE f.id = $1`,
            [id]
        );

        await client.query("COMMIT");
        inTransaction = false;
        return formatFoodListing(result.rows[0]);
    } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

async function cancelFoodListing(id, user) {
    const result = await pool.query(
        `UPDATE food_listings f
     SET status = 'cancelled'
     FROM organizations o
     WHERE f.id = $1
       AND o.id = f.donor_organization_id
       AND (o.owner_user_id = $2 OR $3::boolean)
       AND f.status = 'available'
       AND f.expires_at > NOW()
       AND f.pickup_end_at > NOW()
     RETURNING f.id`,
        [id, user.id, user.role === "admin"]
    );

    if (!result.rowCount) {
        throw httpError(404, "Active food listing not found");
    }

    return { id, status: "cancelled" };
}

module.exports = {
    createFoodListing,
    listFoodListings,
    getMyFoodListings,
    getFoodListingById,
    updateFoodListing,
    cancelFoodListing,
};

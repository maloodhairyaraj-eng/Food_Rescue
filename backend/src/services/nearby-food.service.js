const {
    isApprovalRequired,
    canOrganizationParticipate,
    sqlEligibilityCondition,
} = require("../utils/organization-eligibility");

const { pool } = require("../config/db");

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function formatNearbyListing(row) {
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
        distanceKm: Number(row.distance_km),
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function getNearbyFoodListings(user, filters = {}) {
    if (user.role !== "ngo") {
        throw httpError(
            403,
            "Only NGO accounts can use nearby food discovery"
        );
    }

    const radiusKm = Number(filters.radiusKm ?? 5);
    const limit = Number(filters.limit ?? 20);
    const offset = Number(filters.offset ?? 0);

    const client = await pool.connect();

    try {
        // One read-only transaction gives the count and
        // page results a consistent database snapshot.
        await client.query(
            "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
        );

        const ngoResult = await client.query(
            `
      SELECT
        id,
        organization_type,
        is_verified,
        verification_status,
        location
      FROM organizations
      WHERE owner_user_id = $1
      LIMIT 1
      `,
            [user.id]
        );

        const ngo = ngoResult.rows[0];

        if (!ngo || ngo.organization_type !== "ngo") {
            throw httpError(
                403,
                "Registered NGO organization required"
            );
        }

        if (!canOrganizationParticipate(ngo)) {
            throw httpError(
                403,
                "NGO organization is not eligible"
            );
        }

        if (!ngo.location) {
            throw httpError(
                409,
                "NGO location is not configured"
            );
        }

        const values = [
            ngo.id,
            radiusKm * 1000,
            isApprovalRequired(),
        ];

        let foodTypeCondition = "";

        if (filters.foodType) {
            values.push(filters.foodType);
            foodTypeCondition =
                `AND f.food_type = $${values.length}`;
        }

        const spatialWhere = `
      f.status = 'available'
      AND f.expires_at > NOW()
      AND f.pickup_end_at > NOW()
      AND ${sqlEligibilityCondition("donor", 3)}
      AND ST_DWithin(
        f.pickup_location,
        ngo.location,
        $2
      )
      ${foodTypeCondition}
    `;

        const countResult = await client.query(
            `
      SELECT COUNT(*)::integer AS total
      FROM food_listings f
      JOIN organizations donor
        ON donor.id = f.donor_organization_id
      CROSS JOIN organizations ngo
      WHERE ngo.id = $1
        AND ${spatialWhere}
      `,
            values
        );

        const pageValues = [
            ...values,
            limit,
            offset,
        ];

        const limitIndex = pageValues.length - 1;
        const offsetIndex = pageValues.length;

        const listingsResult = await client.query(
            `
      SELECT
        f.id,
        f.donor_organization_id,
        donor.name AS donor_name,
        f.title,
        f.description,
        f.food_type,
        f.quantity,
        f.quantity_unit,
        f.prepared_at,
        f.expires_at,
        f.pickup_start_at,
        f.pickup_end_at,
        f.pickup_address,
        f.status,
        ST_Y(
          f.pickup_location::geometry
        ) AS latitude,
        ST_X(
          f.pickup_location::geometry
        ) AS longitude,
        ROUND(
          (
            ST_Distance(
              f.pickup_location,
              ngo.location
            ) / 1000.0
          )::numeric,
          2
        ) AS distance_km,
        f.created_at,
        f.updated_at
      FROM food_listings f
      JOIN organizations donor
        ON donor.id = f.donor_organization_id
      CROSS JOIN organizations ngo
      WHERE ngo.id = $1
        AND ${spatialWhere}
      ORDER BY
        ST_Distance(
          f.pickup_location,
          ngo.location
        ) ASC,
        f.id ASC
      LIMIT $${limitIndex}
      OFFSET $${offsetIndex}
      `,
            pageValues
        );

        await client.query("COMMIT");

        return {
            listings: listingsResult.rows.map(
                formatNearbyListing
            ),
            search: {
                radiusKm,
                origin: "ngo_organization",
            },
            pagination: {
                total: countResult.rows[0].total,
                limit,
                offset,
            },
        };
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            console.error(
                "Nearby discovery rollback failed:",
                rollbackError.message
            );
        }

        throw error;
    } finally {
        client.release();
    }
}

module.exports = { getNearbyFoodListings };

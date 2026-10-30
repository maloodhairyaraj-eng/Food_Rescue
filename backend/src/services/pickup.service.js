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

const REQUEST_SELECT = `
  p.id,
  p.food_listing_id,
  p.ngo_organization_id,
  p.requested_by_user_id,
  p.requested_quantity,
  p.status,
  p.notes,
  p.decided_by,
  p.decided_at,
  p.decision_reason,
  p.created_at,
  p.updated_at,
  f.title AS food_title,
  f.status AS listing_status,
  f.expires_at,
  ngo.name AS ngo_name,
  donor.name AS donor_name
`;

const REQUEST_JOINS = `
  FROM pickup_requests p
  JOIN food_listings f
    ON f.id = p.food_listing_id
  JOIN organizations ngo
    ON ngo.id = p.ngo_organization_id
  JOIN organizations donor
    ON donor.id = f.donor_organization_id
`;

function formatPickupRequest(row) {
    return {
        id: row.id,
        foodListingId: row.food_listing_id,
        ngoOrganizationId: row.ngo_organization_id,
        requestedByUserId: row.requested_by_user_id,
        requestedQuantity: row.requested_quantity,
        status: row.status,
        notes: row.notes,
        decidedBy: row.decided_by,
        decidedAt: row.decided_at,
        decisionReason: row.decision_reason,
        foodTitle: row.food_title,
        listingStatus: row.listing_status,
        expiresAt: row.expires_at,
        ngoName: row.ngo_name,
        donorName: row.donor_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function createPickupRequest(user, data) {
    if (user.role !== "ngo") {
        throw httpError(403, "Only NGO accounts can request food");
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
        await client.query("BEGIN");
        inTransaction = true;

        const ngoResult = await client.query(
            `SELECT id, organization_type, is_verified,
              verification_status
       FROM organizations
       WHERE owner_user_id = $1
       FOR UPDATE`,
            [user.id]
        );

        const ngo = ngoResult.rows[0];

        if (!ngo || ngo.organization_type !== "ngo") {
            throw httpError(403, "Registered NGO required");
        }

        if (!canOrganizationParticipate(ngo)) {
            throw httpError(
                403,
                "NGO organization is not eligible"
            );
        }


        const listingResult = await client.query(
            `SELECT f.id, f.quantity, f.status,
              f.expires_at, f.pickup_end_at,
              o.is_verified AS donor_verified,
              o.verification_status AS donor_status
       FROM food_listings f
       JOIN organizations o
         ON o.id = f.donor_organization_id
       WHERE f.id = $1
       FOR UPDATE OF f, o`,
            [data.foodListingId]
        );

        const listing = listingResult.rows[0];

        if (!listing) {
            throw httpError(404, "Food listing not found");
        }

        if (listing.status !== "available" ||
            new Date(listing.expires_at) <= new Date() ||
            new Date(listing.pickup_end_at) <= new Date()) {
            throw httpError(409, "Food listing unavailable");
        }

        if (
            !canOrganizationParticipate({
                is_verified: listing.donor_verified,
                verification_status: listing.donor_status,
            })
        ) {
            throw httpError(
                409,
                "Donor organization is not eligible for pickup"
            );
        }

        const reservation = await client.query(
            `UPDATE food_listings
       SET status = 'reserved', reserved_at = NOW()
       WHERE id = $1
         AND status = 'available'
         AND expires_at > NOW()
         AND pickup_end_at > NOW()
       RETURNING id`,
            [listing.id]
        );

        if (!reservation.rowCount) {
            throw httpError(409, "Listing already reserved");
        }

        const inserted = await client.query(
            `INSERT INTO pickup_requests (
         food_listing_id, ngo_organization_id,
         requested_by_user_id, requested_quantity, notes
       )
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
            [
                listing.id, ngo.id, user.id,
                listing.quantity, data.notes ?? null,
            ]
        );

        const result = await client.query(
            `SELECT ${REQUEST_SELECT}
       ${REQUEST_JOINS}
       WHERE p.id = $1`,
            [inserted.rows[0].id]
        );

        await client.query("COMMIT");
        inTransaction = false;

        return formatPickupRequest(result.rows[0]);
    } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");

        if (error.code === "23505") {
            throw httpError(409, "Active request already exists");
        }

        throw error;
    } finally {
        client.release();
    }
}

async function getMyPickupRequests(user) {
    if (user.role !== "ngo") {
        throw httpError(403, "Only NGOs can view their requests");
    }

    const result = await pool.query(
        `SELECT ${REQUEST_SELECT}
     ${REQUEST_JOINS}
     WHERE ngo.owner_user_id = $1
     ORDER BY p.created_at DESC`,
        [user.id]
    );

    return result.rows.map(formatPickupRequest);
}

async function getIncomingPickupRequests(user) {
    if (user.role !== "donor") {
        throw httpError(403, "Only donors can view incoming requests");
    }

    const result = await pool.query(
        `SELECT ${REQUEST_SELECT}
     ${REQUEST_JOINS}
     WHERE donor.owner_user_id = $1
     ORDER BY p.created_at DESC`,
        [user.id]
    );

    return result.rows.map(formatPickupRequest);
}

async function getPickupRequestById(id, user) {
    const result = await pool.query(
        `SELECT ${REQUEST_SELECT},
            ngo.owner_user_id AS ngo_owner_id,
            donor.owner_user_id AS donor_owner_id
     ${REQUEST_JOINS}
     WHERE p.id = $1`,
        [id]
    );

    if (!result.rowCount) {
        throw httpError(404, "Pickup request not found");
    }

    const row = result.rows[0];

    if (
        row.ngo_owner_id !== user.id &&
        row.donor_owner_id !== user.id &&
        user.role !== "admin"
    ) {
        throw httpError(404, "Pickup request not found");
    }

    return formatPickupRequest(row);
}

async function decidePickupRequest(id, user, decision, reason) {
    if (user.role !== "donor") {
        throw httpError(403, "Only donors can decide requests");
    }

    if (!["approved", "rejected"].includes(decision)) {
        throw httpError(400, "Invalid decision");
    }

    if (decision === "rejected" &&
        (!reason || !reason.trim())) {
        throw httpError(400, "Rejection reason required");
    }

    const client = await pool.connect();
    let inTransaction = false;

    try {
        await client.query("BEGIN");
        inTransaction = true;

        // Lock listing first, then request. This order
        // matches the reservation workflow.
        const lookup = await client.query(
            `SELECT food_listing_id
       FROM pickup_requests
       WHERE id = $1`,
            [id]
        );

        if (!lookup.rowCount) {
            throw httpError(404, "Pickup request not found");
        }

        const listingResult = await client.query(
            `SELECT f.id, f.status, f.expires_at,
              f.pickup_end_at, o.owner_user_id,
              o.is_verified, o.verification_status
       FROM food_listings f
       JOIN organizations o
         ON o.id = f.donor_organization_id
       WHERE f.id = $1
       FOR UPDATE OF f, o`,
            [lookup.rows[0].food_listing_id]
        );

        if (!listingResult.rowCount) {
            throw httpError(404, "Pickup request not found");
        }

        const listing = listingResult.rows[0];

        if (listing.owner_user_id !== user.id) {
            throw httpError(404, "Pickup request not found");
        }

        const requestResult = await client.query(
            `SELECT id, status
       FROM pickup_requests
       WHERE id = $1
       FOR UPDATE`,
            [id]
        );

        const pickup = requestResult.rows[0];

        if (!pickup || pickup.status !== "pending") {
            throw httpError(409, "Request already decided");
        }

        if (listing.status !== "reserved") {
            throw httpError(409, "Listing is not reserved");
        }

        if (decision === "approved") {
            if (
                new Date(listing.expires_at) <= new Date() ||
                new Date(listing.pickup_end_at) <= new Date() ||
                !canOrganizationParticipate(listing)
            ) {
                throw httpError(
                    409,
                    "Food is no longer eligible for approval"
                );
            }
        }



        await client.query(
            `UPDATE pickup_requests
       SET status = $1,
           decided_by = $2,
           decided_at = NOW(),
           decision_reason = $3
       WHERE id = $4`,
            [
                decision, user.id,
                decision === "rejected" ? reason.trim() : null,
                id,
            ]
        );

        if (decision === "rejected") {
            const reusable =
                new Date(listing.expires_at) > new Date() &&
                new Date(listing.pickup_end_at) > new Date() &&
                canOrganizationParticipate(listing);

            await client.query(
                `UPDATE food_listings
         SET status = $1, reserved_at = NULL
         WHERE id = $2`,
                [reusable ? "available" : "expired", listing.id]
            );
        }

        const finalResult = await client.query(
            `SELECT ${REQUEST_SELECT}
       ${REQUEST_JOINS}
       WHERE p.id = $1`,
            [id]
        );

        await client.query("COMMIT");
        inTransaction = false;

        return formatPickupRequest(finalResult.rows[0]);
    } catch (error) {
        if (inTransaction) await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    createPickupRequest,
    getMyPickupRequests,
    getIncomingPickupRequests,
    getPickupRequestById,
    decidePickupRequest,
};

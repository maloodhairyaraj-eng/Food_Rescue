
const { pool } = require("../config/db");

function httpError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

const ASSIGNMENT_SELECT = `
  a.id,
  a.pickup_request_id,
  a.volunteer_user_id,
  a.assigned_by_user_id,
  a.status,
  a.assigned_at,
  a.picked_up_at,
  a.completed_at,
  a.created_at,
  a.updated_at,
  p.status AS pickup_status,
  f.id AS food_listing_id,
  f.title AS food_title,
  f.status AS listing_status,
  ngo.name AS ngo_name,
  donor.name AS donor_name
`;

const ASSIGNMENT_JOINS = `
  FROM volunteer_assignments a
  JOIN pickup_requests p
    ON p.id = a.pickup_request_id
  JOIN food_listings f
    ON f.id = p.food_listing_id
  JOIN organizations ngo
    ON ngo.id = p.ngo_organization_id
  JOIN organizations donor
    ON donor.id = f.donor_organization_id
`;

function formatAssignment(row) {
    return {
        id: row.id,
        pickupRequestId: row.pickup_request_id,
        volunteerUserId: row.volunteer_user_id,
        assignedByUserId: row.assigned_by_user_id,
        status: row.status,
        assignedAt: row.assigned_at,
        pickedUpAt: row.picked_up_at,
        completedAt: row.completed_at,
        foodListingId: row.food_listing_id,
        foodTitle: row.food_title,
        pickupStatus: row.pickup_status,
        listingStatus: row.listing_status,
        ngoName: row.ngo_name,
        donorName: row.donor_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

async function readAssignment(client, id) {
    const result = await client.query(
        `SELECT ${ASSIGNMENT_SELECT}
     ${ASSIGNMENT_JOINS}
     WHERE a.id = $1`,
        [id]
    );

    return result.rows[0]
        ? formatAssignment(result.rows[0])
        : null;
}

async function assignVolunteer(requestId, user, volunteerId) {
    if (user.role !== "ngo") {
        throw httpError(403, "Only NGOs can assign volunteers");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Read the listing ID without locking first.
        const lookup = await client.query(
            `SELECT food_listing_id
       FROM pickup_requests
       WHERE id = $1`,
            [requestId]
        );

        if (!lookup.rowCount) {
            throw httpError(404, "Pickup request not found");
        }

        // Lock order: listing, request, assignment.
        const listing = await client.query(
            `SELECT id, status, expires_at, pickup_end_at
       FROM food_listings
       WHERE id = $1
       FOR UPDATE`,
            [lookup.rows[0].food_listing_id]
        );

        const request = await client.query(
            `SELECT p.id, p.status, ngo.owner_user_id,
              ngo.is_verified, ngo.verification_status
       FROM pickup_requests p
       JOIN organizations ngo
         ON ngo.id = p.ngo_organization_id
       WHERE p.id = $1
       FOR UPDATE OF p`,
            [requestId]
        );

        const pickup = request.rows[0];

        if (!pickup || pickup.owner_user_id !== user.id) {
            throw httpError(404, "Pickup request not found");
        }

        if (
            pickup.status !== "approved" ||
            listing.rows[0].status !== "reserved"
        ) {
            throw httpError(409, "Pickup is not ready for assignment");
        }

        if (
            !pickup.is_verified ||
            pickup.verification_status !== "approved"
        ) {
            throw httpError(403, "NGO is not verified");
        }

        if (
            new Date(listing.rows[0].expires_at).getTime() <= Date.now() ||
            new Date(listing.rows[0].pickup_end_at).getTime() <= Date.now()
        ) {
            throw httpError(409, "Pickup window has ended");
        }


        const volunteer = await client.query(
            `
  SELECT id, role, is_active
  FROM users
  WHERE id = $1
  FOR UPDATE
  `,
            [volunteerId]
        );

        if (
            !volunteer.rowCount ||
            volunteer.rows[0].role !== "volunteer" ||
            volunteer.rows[0].is_active !== true
        ) {
            throw httpError(
                404,
                "Active volunteer not found"
            );
        }


        const existing = await client.query(
            `SELECT id FROM volunteer_assignments
       WHERE pickup_request_id = $1
       FOR UPDATE`,
            [requestId]
        );

        // MVP: one assignment for the entire pickup lifecycle.
        if (existing.rowCount) {
            throw httpError(409, "Pickup already has an assignment");
        }

        const inserted = await client.query(
            `INSERT INTO volunteer_assignments (
         pickup_request_id,
         volunteer_user_id,
         assigned_by_user_id
       )
       VALUES ($1, $2, $3)
       RETURNING id`,
            [requestId, volunteerId, user.id]
        );

        const result = await readAssignment(
            client,
            inserted.rows[0].id
        );

        await client.query("COMMIT");
        return result;

    } catch (error) {
        await client.query("ROLLBACK");

        if (error.code === "23505") {
            throw httpError(409, "Pickup already assigned");
        }

        throw error;
    } finally {
        client.release();
    }
}

async function getVolunteerAssignments(user) {
    if (user.role !== "volunteer") {
        throw httpError(403, "Volunteer role required");
    }

    const result = await pool.query(
        `SELECT ${ASSIGNMENT_SELECT}
     ${ASSIGNMENT_JOINS}
     WHERE a.volunteer_user_id = $1
     ORDER BY a.assigned_at DESC`,
        [user.id]
    );

    return result.rows.map(formatAssignment);
}

async function getAssignmentById(id, user) {
    const result = await pool.query(
        `SELECT ${ASSIGNMENT_SELECT},
            ngo.owner_user_id AS ngo_owner_id
     ${ASSIGNMENT_JOINS}
     WHERE a.id = $1`,
        [id]
    );

    if (!result.rowCount) {
        throw httpError(404, "Assignment not found");
    }

    const row = result.rows[0];

    if (
        row.volunteer_user_id !== user.id &&
        row.ngo_owner_id !== user.id &&
        user.role !== "admin"
    ) {
        throw httpError(404, "Assignment not found");
    }

    return formatAssignment(row);
}

async function updateAssignmentStatus(id, user, nextStatus) {
    if (user.role !== "volunteer") {
        throw httpError(403, "Volunteer role required");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Discover the related listing without taking a lock.
        const lookup = await client.query(
            `SELECT p.food_listing_id, a.pickup_request_id
       FROM volunteer_assignments a
       JOIN pickup_requests p
         ON p.id = a.pickup_request_id
       WHERE a.id = $1`,
            [id]
        );

        if (!lookup.rowCount) {
            throw httpError(404, "Assignment not found");
        }

        const { food_listing_id, pickup_request_id } =
            lookup.rows[0];

        // Consistent lock order prevents decision races.
        const listing = await client.query(
            `SELECT id, status, expires_at, pickup_end_at
       FROM food_listings
       WHERE id = $1
       FOR UPDATE`,
            [food_listing_id]
        );

        const request = await client.query(
            `SELECT id, status
       FROM pickup_requests
       WHERE id = $1
       FOR UPDATE`,
            [pickup_request_id]
        );

        const assignment = await client.query(
            `SELECT id, status, volunteer_user_id
       FROM volunteer_assignments
       WHERE id = $1
       FOR UPDATE`,
            [id]
        );

        const current = assignment.rows[0];

        if (!current || current.volunteer_user_id !== user.id) {
            throw httpError(404, "Assignment not found");
        }

        const currentStatus = current.status;

        if (
            nextStatus === "picked_up" &&
            currentStatus === "assigned"
        ) {
            if (
                request.rows[0].status !== "approved" ||
                listing.rows[0].status !== "reserved"
            ) {
                throw httpError(409, "Pickup is not approved");
            }

            if (
                new Date(listing.rows[0].expires_at).getTime() <= Date.now() ||
                new Date(listing.rows[0].pickup_end_at).getTime() <= Date.now()
            ) {
                throw httpError(409, "Pickup window has ended");
            }

            await client.query(
                `UPDATE volunteer_assignments
         SET status = 'picked_up',
             picked_up_at = NOW()
         WHERE id = $1`,
                [id]
            );

            await client.query(
                `UPDATE food_listings
         SET status = 'picked_up'
         WHERE id = $1`,
                [food_listing_id]
            );

        } else if (
            nextStatus === "completed" &&
            currentStatus === "picked_up"
        ) {
            if (
                request.rows[0].status !== "approved" ||
                listing.rows[0].status !== "picked_up"
            ) {
                throw httpError(409, "Invalid delivery state");
            }

            await client.query(
                `UPDATE volunteer_assignments
         SET status = 'completed',
             completed_at = NOW()
         WHERE id = $1`,
                [id]
            );

            await client.query(
                `UPDATE pickup_requests
         SET status = 'completed'
         WHERE id = $1`,
                [pickup_request_id]
            );

            await client.query(
                `UPDATE food_listings
         SET status = 'completed'
         WHERE id = $1`,
                [food_listing_id]
            );

        } else {
            throw httpError(409, "Invalid status transition");
        }

        const result = await readAssignment(client, id);

        await client.query("COMMIT");
        return result;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    assignVolunteer,
    getVolunteerAssignments,
    getAssignmentById,
    updateAssignmentStatus,
};

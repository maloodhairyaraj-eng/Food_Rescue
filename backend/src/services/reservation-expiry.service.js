
const { pool } = require("../config/db");

function validateBatchSize(batchSize) {
  if (
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 500
  ) {
    throw new Error("Invalid batch size");
  }
}

async function expireReservations(options = {}) {
  const {
    batchSize = 50,
    db = pool,
  } = options;

  validateBatchSize(batchSize);

  const client = await db.connect();
  let inTransaction = false;

  try {
    await client.query("BEGIN");
    inTransaction = true;

    // Lock expired reservations, skipping rows
    // already being processed by another worker.
    const listings = await client.query(
      `
      SELECT f.id
      FROM food_listings f
      WHERE f.status = 'reserved'
        AND (
          f.expires_at <= NOW()
          OR f.pickup_end_at <= NOW()
        )
      ORDER BY f.pickup_end_at, f.id
      LIMIT $1
      FOR UPDATE OF f SKIP LOCKED
      `,
      [batchSize]
    );

    const processed = [];

    let expiredRequests = 0;
    let expiredAssignments = 0;

    for (const listing of listings.rows) {
      const requests = await client.query(
        `
        SELECT id, status
        FROM pickup_requests
        WHERE food_listing_id = $1
          AND status IN ('pending', 'approved')
        ORDER BY id
        FOR UPDATE
        `,
        [listing.id]
      );

      const assignments = await client.query(
        `
        SELECT a.id, a.status
        FROM volunteer_assignments a
        JOIN pickup_requests p
          ON p.id = a.pickup_request_id
        WHERE p.food_listing_id = $1
          AND a.status IN ('assigned', 'picked_up')
        ORDER BY a.id
        FOR UPDATE OF a
        `,
        [listing.id]
      );

      // Protect food already physically collected.
      if (
        assignments.rows.some(
          (assignment) =>
            assignment.status === "picked_up"
        )
      ) {
        continue;
      }

      // Expire uncollected volunteer assignments.
      const assignmentUpdate = await client.query(
        `
        UPDATE volunteer_assignments a
        SET status = 'expired'
        FROM pickup_requests p
        WHERE a.pickup_request_id = p.id
          AND p.food_listing_id = $1
          AND a.status = 'assigned'
        RETURNING a.id
        `,
        [listing.id]
      );

      expiredAssignments += assignmentUpdate.rowCount;

      // Expire active pickup requests.
      const requestUpdate = await client.query(
        `
        UPDATE pickup_requests
        SET status = 'expired'
        WHERE food_listing_id = $1
          AND status IN ('pending', 'approved')
        RETURNING id
        `,
        [listing.id]
      );

      expiredRequests += requestUpdate.rowCount;

      // Mark the listing expired only after
      // the related records are updated.
      const listingUpdate = await client.query(
        `
        UPDATE food_listings
        SET status = 'expired',
            reserved_at = NULL
        WHERE id = $1
          AND status = 'reserved'
        RETURNING id
        `,
        [listing.id]
      );

      if (listingUpdate.rowCount === 1) {
        processed.push(listing.id);
      }
    }

    await client.query("COMMIT");
    inTransaction = false;

    return {
      expiredListings: processed.length,
      expiredRequests,
      expiredAssignments,
      listingIds: processed,
    };
  } catch (error) {
    if (inTransaction) {
      await client.query("ROLLBACK");
    }
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  expireReservations,
};

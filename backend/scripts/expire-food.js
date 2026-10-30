
require("dotenv").config();

const { pool } = require("../src/config/db");

async function expireFoodListings() {
  try {
    const result = await pool.query(`
      UPDATE food_listings
      SET status = 'expired'
      WHERE status = 'available'
        AND (
          expires_at <= NOW()
          OR pickup_end_at <= NOW()
        )
      RETURNING id
    `);

    console.log(
      `Expiry maintenance completed: ${result.rowCount} listings expired`
    );

    return result.rowCount;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  expireFoodListings().catch((error) => {
    console.error("Expiry maintenance failed:", error.message);
    process.exitCode = 1;
  });
}

module.exports = { expireFoodListings };

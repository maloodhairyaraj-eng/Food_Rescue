
require("dotenv").config();

const { pool } = require("../src/config/db");

const {
  expireReservations,
} = require("../src/services/reservation-expiry.service");

async function main() {
  try {
    const result = await expireReservations();

    console.log("Reservation expiry completed");
    console.log(
      `Listings expired: ${result.expiredListings}`
    );
    console.log(
      `Requests expired: ${result.expiredRequests}`
    );
    console.log(
      `Assignments expired: ${result.expiredAssignments}`
    );
  } catch (error) {
    console.error(
      "Reservation expiry failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

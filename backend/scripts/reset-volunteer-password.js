
require("dotenv").config();

const bcrypt = require("bcrypt");
const { pool } = require("../src/config/db");

const EMAIL = "volunteer-delivery@example.com";

async function main() {
  const databaseName = process.env.DB_NAME;

  if (
    !["zero_waste_db", "zero_waste_test_db"].includes(
      databaseName
    )
  ) {
    throw new Error(
      "Password reset is restricted to local development databases"
    );
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      SELECT id, email, role
      FROM users
      WHERE email = $1
      FOR UPDATE
      `,
      [EMAIL]
    );

    if (result.rowCount !== 1) {
      throw new Error("Volunteer account not found");
    }

    const user = result.rows[0];

    if (user.role !== "volunteer") {
      throw new Error(
        "Refusing to reset a non-volunteer account"
      );
    }

    const password = process.env.TEMP_VOLUNTEER_PASSWORD;

    if (!password || password.length < 12) {
      throw new Error(
        "Set TEMP_VOLUNTEER_PASSWORD to a password of at least 12 characters"
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await client.query(
      `
      UPDATE users
      SET password_hash = $1
      WHERE id = $2
      `,
      [passwordHash, user.id]
    );

    await client.query("COMMIT");

    console.log("Volunteer password reset successfully");
    console.log("Email:", user.email);
    console.log("Role:", user.role);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Password reset failed:", error.message);
  process.exitCode = 1;
});

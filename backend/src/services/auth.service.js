
"use strict";

const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { signAccessToken } = require("../utils/jwt");

const SALT_ROUNDS = 12;

// Used to reduce login timing differences when
// the requested account does not exist.
const DUMMY_HASH = bcrypt.hashSync(
  "dummy-password-not-used-for-login",
  SALT_ROUNDS
);

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function publicUser(row) {
  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    is_active: row.is_active,
    created_at: row.created_at,
  };
}

async function registerUser(data) {
  const {
    fullName,
    email,
    password,
    phone,
    role,
  } = data;

  const normalizedEmail = email.trim().toLowerCase();

  // Keep bcrypt hashing outside the transaction
  // to avoid holding a database connection while
  // performing CPU-intensive password hashing.
  const passwordHash = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  const client = await pool.connect();
  let inTransaction = false;

  try {
    await client.query("BEGIN");
    inTransaction = true;

    // Unique email constraint remains the final
    // protection against concurrent registrations.
    const existing = await client.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      throw httpError(
        409,
        "Email already registered"
      );
    }

    const result = await client.query(
      `
      INSERT INTO users (
        full_name,
        email,
        password_hash,
        phone,
        role
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        full_name,
        email,
        phone,
        role,
        is_active,
        created_at
      `,
      [
        fullName,
        normalizedEmail,
        passwordHash,
        phone || null,
        role,
      ]
    );

    const user = result.rows[0];

    if (!user) {
      throw httpError(
        500,
        "User registration was not confirmed"
      );
    }

    // Volunteers require a profile record.
    // Both records are created atomically.
    if (role === "volunteer") {
      await client.query(
        `
        INSERT INTO volunteers (
          user_id,
          is_available
        )
        VALUES ($1, FALSE)
        `,
        [user.id]
      );
    }

    await client.query("COMMIT");
    inTransaction = false;

    return publicUser(user);
  } catch (error) {
    if (inTransaction) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Registration rollback failed:",
          rollbackError.message
        );
      }
    }

    if (error.code === "23505") {
      throw httpError(
        409,
        "Email already registered"
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

async function loginUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
    SELECT
      id,
      full_name,
      email,
      phone,
      role,
      password_hash,
      is_active,
      created_at
    FROM users
    WHERE LOWER(email) = $1
    LIMIT 1
    `,
    [normalizedEmail]
  );

  const user = result.rows[0];

  const hash = user
    ? user.password_hash
    : DUMMY_HASH;

  const passwordValid = await bcrypt.compare(
    password,
    hash
  );

  if (
    !user ||
    !passwordValid ||
    !user.is_active
  ) {
    throw httpError(
      401,
      "Invalid email or password"
    );
  }

  const accessToken = signAccessToken(user.id);

  return {
    user: publicUser(user),
    accessToken,
    tokenType: "Bearer",
    expiresIn: 900,
  };
}

async function getUserById(userId) {
  const result = await pool.query(
    `
    SELECT
      id,
      full_name,
      email,
      phone,
      role,
      is_active,
      created_at
    FROM users
    WHERE id = $1
    LIMIT 1
    `,
    [userId]
  );

  return result.rows[0]
    ? publicUser(result.rows[0])
    : null;
}

module.exports = {
  registerUser,
  loginUser,
  getUserById,
};

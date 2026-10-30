
const bcrypt = require("bcrypt");
const { pool } = require("../config/db");
const { signAccessToken } = require("../utils/jwt");

const SALT_ROUNDS = 12;

// Dummy bcrypt hash to reduce timing differences
// when an account does not exist.
const DUMMY_HASH = bcrypt.hashSync(
  "dummy-password-not-used-for-login",
  SALT_ROUNDS
);

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

  const existing = await pool.query(
    "SELECT id FROM users WHERE LOWER(email) = $1",
    [normalizedEmail]
  );

  if (existing.rowCount > 0) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(
    password,
    SALT_ROUNDS
  );

  try {
    const result = await pool.query(
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

    return publicUser(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      const conflict = new Error("Email already registered");
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
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

  if (!user || !passwordValid || !user.is_active) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
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

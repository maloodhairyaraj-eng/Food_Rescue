
"use strict";

const { Pool } = require("pg");
require("dotenv").config();

const sslEnabled =
  process.env.DB_SSL === "true";

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,

  ssl: sslEnabled
    ? { rejectUnauthorized: true }
    : false,

  // Supabase commonly installs PostGIS under extensions.
  options: "-c search_path=public,extensions",
});

pool.on("error", (error) => {
  console.error(
    "PostgreSQL pool error:",
    error.message
  );
});

async function testConnection() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT
        current_database() AS database_name,
        current_user AS database_user,
        PostGIS_Version() AS postgis_version
    `);

    return result.rows[0];
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  testConnection,
};

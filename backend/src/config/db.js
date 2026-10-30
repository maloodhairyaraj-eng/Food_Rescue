
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error(
    "Unexpected PostgreSQL pool error:",
    err.message
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

    console.log("PostgreSQL connected successfully!");
    console.log("Database:", result.rows[0].database_name);
    console.log("User:", result.rows[0].database_user);
    console.log("PostGIS:", result.rows[0].postgis_version);
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  testConnection,
};

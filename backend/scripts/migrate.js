
require("dotenv").config();

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const required = [
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const command = process.argv[2];

if (!["up", "down", "status"].includes(command)) {
  console.error("Usage: node scripts/migrate.js up|down|status");
  process.exit(1);
}

const executable = path.resolve(
  __dirname,
  "../node_modules/node-pg-migrate/bin/node-pg-migrate.js"
);

const args = [
  executable,
  command,
  "--migrations-dir",
  path.resolve(__dirname, "../migrations"),
  "--migrations-table",
  "pgmigrations",
  "--no-check-order",
];

const result = spawnSync(
  process.execPath,
  args,
  {
    stdio: "inherit",
    env: {
      ...process.env,
      PGHOST: process.env.DB_HOST,
      PGPORT: process.env.DB_PORT,
      PGDATABASE: process.env.DB_NAME,
      PGUSER: process.env.DB_USER,
      PGPASSWORD: process.env.DB_PASSWORD,
    },
  }
);

if (result.error) {
  console.error("Migration runner failed:", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);

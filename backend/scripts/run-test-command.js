
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const dotenv = require("dotenv");

const envPath = path.resolve(
  __dirname,
  "../.env.test"
);

const result = dotenv.config({
  path: envPath,
  override: true,
});

if (result.error) {
  console.error(
    "Could not load .env.test:",
    result.error.message
  );
  process.exit(1);
}

if (
  process.env.NODE_ENV !== "test" ||
  process.env.DB_NAME !== "zero_waste_test_db"
) {
  console.error(
    "Refusing to run: invalid test environment"
  );
  process.exit(1);
}

const command = process.argv[2];

if (command === "migrate") {
  const child = spawnSync(
    process.execPath,
    ["scripts/migrate.js", "up"],
    {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    }
  );

  if (child.error) {
    console.error(child.error.message);
    process.exit(1);
  }

  process.exit(child.status ?? 1);
}

if (command === "test") {
  const jestPath = require.resolve("jest/bin/jest");

  const child = spawnSync(
    process.execPath,
    [
      jestPath,
      "--runInBand",
      ...process.argv.slice(3),
    ],
    {
      cwd: path.resolve(__dirname, ".."),
      stdio: "inherit",
      env: process.env,
    }
  );

  if (child.error) {
    console.error(child.error.message);
    process.exit(1);
  }

  process.exit(child.status ?? 1);
}

console.error(
  "Usage: node scripts/run-test-command.js migrate|test"
);
process.exit(1);

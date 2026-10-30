
require("dotenv").config();

const app = require("./app");

const { pool, testConnection } = require("./config/db");
const { getJwtSecret } = require("./utils/jwt");

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    getJwtSecret();
    await testConnection();

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exitCode = 1;
    await pool.end();
  }
}

startServer();


const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const { pool } = require("./config/db");

const authRoutes = require("./routes/auth.routes");
const accessRoutes = require("./routes/access.routes");
const organizationRoutes = require("./routes/organization.routes");
const foodRoutes = require("./routes/food.routes");
const pickupRoutes = require("./routes/pickup.routes");
const volunteerRoutes = require("./routes/volunteer.routes");

const {
  errorHandler,
} = require("./middleware/error.middleware");

const app = express();

app.disable("x-powered-by");
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL ||
    "http://localhost:3000", 
}));

app.use(express.json({ limit: "100kb" }));

app.get("/api/v1/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Zero Waste API is running",
    data: { status: "healthy" },
  });
});

app.get("/api/v1/health/database", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database_name,
        PostGIS_Version() AS postgis_version
    `);

    return res.status(200).json({
      success: true,
      message: "Database connected successfully",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(
      "Database health check failed:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/access", accessRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/food-listings", foodRoutes);
app.use("/api/v1/pickup-requests", pickupRoutes);
app.use("/api/v1/volunteer", volunteerRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;

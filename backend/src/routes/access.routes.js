
const express = require("express");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const {
  authorize,
} = require("../middleware/authorize.middleware");

const {
  PERMISSIONS,
} = require("../config/permissions");

const {
  getFoodListingsAccess,
  getDonorAccess,
  getNgoAccess,
  getVolunteerAccess,
  getAdminAccess,
} = require("../controllers/access.controller");

const router = express.Router();

// Every route requires a valid JWT.
router.use(authenticate);

// Shared food browsing permission
router.get(
  "/food",
  authorize(PERMISSIONS.FOOD_READ),
  getFoodListingsAccess
);

// Donor food creation permission
router.get(
  "/donor",
  authorize(PERMISSIONS.FOOD_CREATE),
  getDonorAccess
);

// NGO pickup request permission
router.get(
  "/ngo",
  authorize(PERMISSIONS.PICKUP_REQUEST_CREATE),
  getNgoAccess
);

// Volunteer delivery permission
router.get(
  "/volunteer",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  getVolunteerAccess
);

// Admin dashboard permission
router.get(
  "/admin",
  authorize(PERMISSIONS.ADMIN_DASHBOARD_READ),
  getAdminAccess
);

module.exports = router;

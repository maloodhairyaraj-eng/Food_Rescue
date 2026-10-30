
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
  createOrganizationValidation,
  updateOrganizationValidation,
  organizationIdValidation,
} = require("../validators/organization.validator");

const {
  create,
  getMine,
  getById,
  update,
} = require("../controllers/organization.controller");

const router = express.Router();

// All organization endpoints require authentication.
router.use(authenticate);

// Create organization
router.post(
  "/",
  authorize(PERMISSIONS.ORGANIZATION_CREATE),
  createOrganizationValidation,
  create
);

// IMPORTANT: /me must be before /:id
router.get(
  "/me",
  authorize(PERMISSIONS.ORGANIZATION_READ),
  getMine
);

// Get organization by UUID
router.get(
  "/:id",
  authorize(PERMISSIONS.ORGANIZATION_READ),
  organizationIdValidation,
  getById
);

// Update organization
router.patch(
  "/:id",
  authorize(PERMISSIONS.ORGANIZATION_UPDATE),
  updateOrganizationValidation,
  update
);

module.exports = router;


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
  listOrganizationsValidation,
  verificationValidation,
} = require("../validators/admin.validator");

const {
  getOrganizations,
  verifyOrganization,
} = require("../controllers/admin.controller");

const router = express.Router();

router.use(authenticate);

router.get(
  "/organizations",
  authorize(PERMISSIONS.ORGANIZATION_VERIFY),
  listOrganizationsValidation,
  getOrganizations
);

router.patch(
  "/organizations/:id/verification",
  authorize(PERMISSIONS.ORGANIZATION_VERIFY),
  verificationValidation,
  verifyOrganization
);

module.exports = router;

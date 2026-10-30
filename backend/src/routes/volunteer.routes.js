
"use strict";

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
  assignmentIdValidation,
  updateAssignmentStatusValidation,
} = require("../validators/volunteer.validator");

const {
  updateAvailabilityValidation,
} = require("../validators/volunteer-directory.validator");

const controller = require(
  "../controllers/volunteer.controller"
);

const directoryController = require(
  "../controllers/volunteer-directory.controller"
);

const router = express.Router();

router.use(authenticate);

// NGO volunteer directory.
// Assignment permission is required.
router.get(
  "/directory",
  authorize(PERMISSIONS.PICKUP_ASSIGN),
  directoryController.getDirectory
);

// Volunteer's own availability.
router.get(
  "/availability",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  directoryController.getAvailability
);

router.patch(
  "/availability",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  updateAvailabilityValidation,
  directoryController.updateAvailability
);

// Existing assignment routes.
router.get(
  "/assignments",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  controller.getMine
);

router.get(
  "/assignments/:id",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  assignmentIdValidation,
  controller.getById
);

router.patch(
  "/assignments/:id/status",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  updateAssignmentStatusValidation,
  controller.updateStatus
);

module.exports = router;

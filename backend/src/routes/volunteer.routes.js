
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

const controller = require("../controllers/volunteer.controller");

const router = express.Router();

router.use(authenticate);

router.get(
  "/assignments",
  authorize(PERMISSIONS.DELIVERY_MANAGE),
  controller.getMine
);

router.get(
  "/assignments/:id",
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

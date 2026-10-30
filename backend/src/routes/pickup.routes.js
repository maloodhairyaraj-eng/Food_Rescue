
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
  createPickupValidation,
  pickupIdValidation,
  rejectPickupValidation,
} = require("../validators/pickup.validator");

const controller = require("../controllers/pickup.controller");

const volunteerController =
  require("../controllers/volunteer.controller");

const {
  assignVolunteerValidation,
} = require("../validators/volunteer.validator");

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorize(PERMISSIONS.PICKUP_REQUEST_CREATE),
  createPickupValidation,
  controller.create
);

router.get(
  "/mine",
  controller.getMine
);

router.get(
  "/incoming",
  controller.getIncoming
);

router.get(
  "/:id",
  pickupIdValidation,
  controller.getById
);

router.patch(
  "/:id/approve",
  pickupIdValidation,
  controller.approve
);

router.patch(
  "/:id/reject",
  rejectPickupValidation,
  controller.reject
);


router.post(
  "/:id/assign",
  authorize(PERMISSIONS.PICKUP_ASSIGN),
  assignVolunteerValidation,
  volunteerController.assign
);


module.exports = router;

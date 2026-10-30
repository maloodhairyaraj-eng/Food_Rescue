
const {
  body,
  param,
  validationResult,
} = require("express-validator");

function handleValidation(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }

  next();
}

const assignVolunteerValidation = [
  param("id").isUUID(),

  body().custom((value) => {
    if (!value || typeof value !== "object" ||
        Array.isArray(value)) {
      throw new Error("Invalid request body");
    }

    if (
      Object.keys(value).some(
        (key) => key !== "volunteerUserId"
      )
    ) {
      throw new Error("Unsupported fields");
    }

    return true;
  }),

  body("volunteerUserId")
    .isUUID()
    .withMessage("Valid volunteer user ID required"),

  handleValidation,
];

const assignmentIdValidation = [
  param("id").isUUID(),
  handleValidation,
];

const updateAssignmentStatusValidation = [
  param("id").isUUID(),

  body().custom((value) => {
    if (!value || typeof value !== "object" ||
        Array.isArray(value)) {
      throw new Error("Invalid request body");
    }

    if (
      Object.keys(value).some(
        (key) => key !== "status"
      )
    ) {
      throw new Error("Unsupported fields");
    }

    return true;
  }),

  body("status")
    .isIn(["picked_up", "completed"])
    .withMessage("Invalid delivery status"),

  handleValidation,
];

module.exports = {
  assignVolunteerValidation,
  assignmentIdValidation,
  updateAssignmentStatusValidation,
};

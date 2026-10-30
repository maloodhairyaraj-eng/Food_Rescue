
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

const createPickupValidation = [
  body().custom((value) => {
    if (!value || typeof value !== "object" ||
        Array.isArray(value)) {
      throw new Error("Invalid request body");
    }

    const allowed = ["foodListingId", "notes"];

    const unknown = Object.keys(value)
      .filter((key) => !allowed.includes(key));

    if (unknown.length) {
      throw new Error("Unsupported fields");
    }

    return true;
  }),

  body("foodListingId").isUUID(),

  body("notes")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 1000 }),

  handleValidation,
];

const pickupIdValidation = [
  param("id").isUUID(),
  handleValidation,
];

const rejectPickupValidation = [
  param("id").isUUID(),

  body().custom((value) => {
    if (!value || typeof value !== "object" ||
        Array.isArray(value)) {
      throw new Error("Invalid request body");
    }

    const keys = Object.keys(value);
    if (keys.some((key) => key !== "reason")) {
      throw new Error("Unsupported fields");
    }

    return true;
  }),

  body("reason")
    .isString()
    .trim()
    .isLength({ min: 3, max: 1000 }),

  handleValidation,
];

module.exports = {
  createPickupValidation,
  pickupIdValidation,
  rejectPickupValidation,
};

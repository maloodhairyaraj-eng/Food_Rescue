
"use strict";

const {
  body,
  validationResult,
} = require("express-validator");

const updateAvailabilityValidation = [
  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error("Invalid request body");
    }

    const keys = Object.keys(value);

    if (
      keys.length !== 1 ||
      keys[0] !== "isAvailable"
    ) {
      throw new Error(
        "Only isAvailable is supported"
      );
    }

    return true;
  }),

  body("isAvailable")
    .isBoolean({ strict: true })
    .withMessage("isAvailable must be boolean"),

  (req, res, next) => {
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
  },
];

module.exports = {
  updateAvailabilityValidation,
};

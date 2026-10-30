
const {
  body,
  param,
  query,
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

const listOrganizationsValidation = [
  query("status")
    .optional()
    .isIn(["pending", "approved", "rejected"]),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .toInt(),

  handleValidation,
];

const verificationValidation = [
  param("id")
    .isUUID()
    .withMessage("Invalid organization ID"),

  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error("Request body must be an object");
    }

    const allowed = ["status", "reason"];

    const unknown = Object.keys(value).filter(
      (key) => !allowed.includes(key)
    );

    if (unknown.length) {
      throw new Error(
        `Unsupported fields: ${unknown.join(", ")}`
      );
    }

    return true;
  }),

  body("status")
    .isIn(["approved", "rejected"])
    .withMessage("Status must be approved or rejected"),

  body("reason")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 1000 }),

  body().custom((value) => {
    if (
      value.status === "rejected" &&
      (
        typeof value.reason !== "string" ||
        !value.reason.trim()
      )
    ) {
      throw new Error(
        "Rejection reason is required"
      );
    }

    return true;
  }),

  handleValidation,
];

module.exports = {
  listOrganizationsValidation,
  verificationValidation,
};

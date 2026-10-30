
const {
  query,
  validationResult,
} = require("express-validator");

const allowedParams = [
  "radiusKm",
  "limit",
  "offset",
  "foodType",
];

const validateFoodMatching = [
  query("radiusKm")
    .optional()
    .isFloat({ min: 0.1, max: 50 })
    .toFloat(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt(),

  query("offset")
    .optional()
    .isInt({ min: 0 })
    .toInt(),

  query("foodType")
    .optional()
    .isIn(["veg", "non_veg", "vegan", "mixed"]),

  query().custom((params) => {
    const unknown = Object.keys(params || {}).filter(
      (key) => !allowedParams.includes(key)
    );

    if (unknown.length > 0) {
      throw new Error(
        `Unsupported parameters: ${unknown.join(", ")}`
      );
    }

    return true;
  }),

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

module.exports = { validateFoodMatching };

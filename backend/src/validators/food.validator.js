
const {
  body,
  param,
  query,
  validationResult,
} = require("express-validator");

const {
  validateFoodTimeline,
  parseTimestamp,
} = require("../utils/food-time");

const FOOD_TYPES = ["veg", "non_veg", "vegan", "mixed"];
const QUANTITY_UNITS = [
  "meals",
  "kg",
  "packets",
  "portions",
];

const CREATE_FIELDS = [
  "title",
  "description",
  "foodType",
  "quantity",
  "quantityUnit",
  "preparedAt",
  "expiresAt",
  "pickupStartAt",
  "pickupEndAt",
  "pickupAddress",
  "pickupLocation",
];

const UPDATE_FIELDS = CREATE_FIELDS.filter(
  (field) => field !== "foodType"
);

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

function allowedFields(fields, requireNonEmpty = false) {
  return body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error("Request body must be an object");
    }

    const keys = Object.keys(value);

    if (requireNonEmpty && keys.length === 0) {
      throw new Error("At least one field is required");
    }

    const unknown = keys.filter(
      (key) => !fields.includes(key)
    );

    if (unknown.length) {
      throw new Error(
        `Unsupported fields: ${unknown.join(", ")}`
      );
    }

    return true;
  });
}

function timestamp(field, required = false) {
  let validator = body(field);

  if (!required) {
    validator = validator.optional({
      values: "null",
    });
  }

  return validator.custom((value) => {
    if (parseTimestamp(value) === null) {
      throw new Error(
        `${field} must be an ISO timestamp with timezone`
      );
    }

    return true;
  });
}

const createFoodValidation = [
  allowedFields(CREATE_FIELDS),

  body("title")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 }),

  body("description")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 3000 }),

  body("foodType").isIn(FOOD_TYPES),

  body("quantity")
    .isInt({ min: 1, max: 100000 })
    .toInt(),

  body("quantityUnit")
    .optional()
    .isIn(QUANTITY_UNITS),

  timestamp("preparedAt"),
  timestamp("expiresAt", true),
  timestamp("pickupStartAt", true),
  timestamp("pickupEndAt", true),

  body("pickupAddress")
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 }),

  body("pickupLocation").isObject(),

  body("pickupLocation.latitude")
    .isFloat({ min: -90, max: 90 }),

  body("pickupLocation.longitude")
    .isFloat({ min: -180, max: 180 }),

  body().custom((value) => {
    const error = validateFoodTimeline(value);

    if (error) throw new Error(error);
    return true;
  }),

  handleValidation,
];

const updateFoodValidation = [
  param("id").isUUID(),

  allowedFields(UPDATE_FIELDS, true),

  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 }),

  body("description")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 3000 }),

  body("quantity")
    .optional()
    .isInt({ min: 1, max: 100000 })
    .toInt(),

  body("quantityUnit")
    .optional()
    .isIn(QUANTITY_UNITS),

  timestamp("preparedAt"),
  timestamp("expiresAt"),
  timestamp("pickupStartAt"),
  timestamp("pickupEndAt"),

  body("pickupAddress")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 }),

  body("pickupLocation")
    .optional()
    .isObject(),

  body("pickupLocation.latitude")
    .if(body("pickupLocation").exists())
    .isFloat({ min: -90, max: 90 }),

  body("pickupLocation.longitude")
    .if(body("pickupLocation").exists())
    .isFloat({ min: -180, max: 180 }),

  handleValidation,
];

const listFoodValidation = [
  query("foodType").optional().isIn(FOOD_TYPES),

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

const foodIdValidation = [
  param("id").isUUID(),
  handleValidation,
];

module.exports = {
  createFoodValidation,
  updateFoodValidation,
  listFoodValidation,
  foodIdValidation,
};


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

const allowedFields = [
  "name",
  "organizationType",
  "description",
  "contactPhone",
  "address",
  "location",
];

const updateFields = [
  "name",
  "description",
  "contactPhone",
  "address",
  "location",
];

const createOrganizationValidation = [
  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error("Request body must be an object");
    }

    const unknown = Object.keys(value)
      .filter((key) => !allowedFields.includes(key));

    if (unknown.length) {
      throw new Error(
        `Unsupported fields: ${unknown.join(", ")}`
      );
    }

    return true;
  }),

  body("name")
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 }),

  body("organizationType")
    .isIn([
      "ngo",
      "restaurant",
      "hostel",
      "caterer",
      "other_donor",
    ]),

  body("description")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 2000 }),

  body("contactPhone")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ min: 7, max: 20 }),

  body("address")
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 }),

  body("location")
    .isObject(),

  body("location.latitude")
    .isFloat({ min: -90, max: 90 }),

  body("location.longitude")
    .isFloat({ min: -180, max: 180 }),

  handleValidation,
];

const updateOrganizationValidation = [
  param("id").isUUID().withMessage("Invalid organization ID"),

  body().custom((value) => {
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    ) {
      throw new Error("Request body must be an object");
    }

    const keys = Object.keys(value);

    if (!keys.length) {
      throw new Error("At least one field is required");
    }

    const unknown = keys.filter(
      (key) => !updateFields.includes(key)
    );

    if (unknown.length) {
      throw new Error(
        `Fields cannot be updated: ${unknown.join(", ")}`
      );
    }

    return true;
  }),

  body("name")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 3, max: 200 }),

  body("description")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ max: 2000 }),

  body("contactPhone")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ min: 7, max: 20 }),

  body("address")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 5, max: 500 }),

  body("location")
    .optional()
    .isObject(),

  body("location.latitude")
    .if(body("location").exists())
    .isFloat({ min: -90, max: 90 }),

  body("location.longitude")
    .if(body("location").exists())
    .isFloat({ min: -180, max: 180 }),

  handleValidation,
];

const organizationIdValidation = [
  param("id").isUUID().withMessage("Invalid organization ID"),
  handleValidation,
];

module.exports = {
  createOrganizationValidation,
  updateOrganizationValidation,
  organizationIdValidation,
};

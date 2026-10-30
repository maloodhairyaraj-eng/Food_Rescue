
const {
  body,
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

const registerValidation = [
  body("fullName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 150 })
    .withMessage("Full name must be 2-150 characters"),

  body("email")
    .isEmail()
    .withMessage("Enter a valid email")
    .bail()
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 12, max: 72 })
    .withMessage("Password must be 12-72 characters"),

  body("role")
    .isIn(["ngo", "donor", "volunteer"])
    .withMessage("Invalid registration role"),

  body("phone")
    .optional({ values: "null" })
    .isString()
    .trim()
    .isLength({ min: 7, max: 20 })
    .withMessage("Phone must be 7-20 characters"),

  handleValidation,
];

const loginValidation = [
  body("email")
    .isEmail()
    .withMessage("Enter a valid email")
    .bail()
    .normalizeEmail(),

  body("password")
    .isString()
    .notEmpty()
    .withMessage("Password is required"),

  handleValidation,
];

module.exports = {
  registerValidation,
  loginValidation,
};

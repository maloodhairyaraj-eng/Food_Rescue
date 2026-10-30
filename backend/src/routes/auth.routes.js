
const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  register,
  login,
  getMe,
} = require("../controllers/auth.controller");

const {
  registerValidation,
  loginValidation,
} = require("../validators/auth.validator");

const {
  authenticate,
} = require("../middleware/auth.middleware");

const router = express.Router();

const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Try again later.",
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});

// Public registration
router.post(
  "/register",
  registrationLimiter,
  registerValidation,
  register
);

// Public login
router.post(
  "/login",
  loginLimiter,
  loginValidation,
  login
);

// Protected user profile
router.get(
  "/me",
  authenticate,
  getMe
);

module.exports = router;

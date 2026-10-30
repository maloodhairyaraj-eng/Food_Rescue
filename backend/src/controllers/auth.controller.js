
const {
  registerUser,
  loginUser,
} = require("../services/auth.service");

async function register(req, res, next) {
  try {
    const user = await registerUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await loginUser(email, password);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  return res.status(200).json({
    success: true,
    message: "User profile retrieved",
    data: {
      user: req.user,
    },
  });
}

module.exports = {
  register,
  login,
  getMe,
};

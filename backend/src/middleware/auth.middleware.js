
const { verifyAccessToken } = require("../utils/jwt");
const { getUserById } = require("../services/auth.service");

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const match = /^Bearer ([^\s]+)$/.exec(header);

    if (!match) {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization header",
      });
    }

    let payload;

    try {
      payload = verifyAccessToken(match[1]);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    if (
      typeof payload !== "object" ||
      typeof payload.sub !== "string"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid token payload",
      });
    }

    const user = await getUserById(payload.sub);

    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account unavailable",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };

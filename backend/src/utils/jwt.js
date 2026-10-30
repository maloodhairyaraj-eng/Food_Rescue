
const jwt = require("jsonwebtoken");

const ISSUER = "zero-waste-api";
const AUDIENCE = "zero-waste-platform";
const ALGORITHM = "HS256";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 64) {
    throw new Error(
      "JWT_SECRET must contain at least 64 characters"
    );
  }

  return secret;
}

function signAccessToken(userId) {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      algorithm: ALGORITHM,
      subject: userId,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [ALGORITHM],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  getJwtSecret,
};


module.exports = {
  testEnvironment: "node",
  testMatch: [
    "**/tests/**/*.test.js",
  ],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 15000,
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js",
  ],
};

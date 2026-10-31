
"use strict";

// Vercel Functions entry point.
// Reuses the existing Express application.
//
// Do not call app.listen() here.
// Vercel manages the HTTP request lifecycle.

const app = require("../src/app");

module.exports = app;

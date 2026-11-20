// ============================================================================
// 🚀 EXPRESS APPLICATION SETUP (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/app.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Express JS, Middlewares in Express, Static Routes, Client-Server Architecture"
//
// 💡 WHY SEPARATE app.js FROM server.js? (CLEAN CODING PRACTICE):
// - `app.js`: Configures all Express settings, middlewares, and routes.
//   It does NOT bind to a network port. This allows our automated test suite
//   (`tests/api.test.js`) to import `app` and test it in isolation on any port!
// - `server.js`: Starts the HTTP listener (`server.listen(5000)`) and manages
//   Node process lifecycle and graceful shutdowns.
// ============================================================================

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

// Create the Express application instance
const app = express();

// ============================================================================
// 1. CORE EXPRESS MIDDLEWARES (PIPELINE)
// ============================================================================

// 💡 CORS (CROSS-ORIGIN RESOURCE SHARING):
// By default, web browsers block web pages on one port (e.g. localhost:3000) from
// talking to APIs on another port (e.g. localhost:5000). CORS tells the browser:
// "Allow this communication!"
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true // Allow authentication cookies to travel across origins
  })
);

// 💡 BODY PARSERS (SERIALIZATION & DESERIALIZATION):
// Converts raw incoming JSON request strings into accessible JavaScript objects in `req.body`!
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 💡 COOKIE PARSER:
// Reads the raw 'Cookie: auth_token=...' header and populates `req.cookies.auth_token`
app.use(cookieParser(config.cookieSecret));

// 💡 CUSTOM REQUEST LOGGER:
// Logs HTTP method, URL path, response status, and duration in ms
app.use(loggerMiddleware);

// 💡 STATIC ROUTES:
// Serves static frontend assets (HTML, CSS, JS) from the 'public' folder.
// When you open http://localhost:5000 in a browser, Express serves `public/index.html`!
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================================
// 2. MOUNT API ROUTES (API VERSIONING: /api/v1)
// ============================================================================
// 💡 LECTURE TOPIC: API Versioning
// All our endpoints are mounted under `/api/v1` so that if we ever release
// a future version v2, existing mobile apps and services don't break!
app.use('/api/v1', routes);

// Fallback endpoint for root URL
app.get('/', (req, res) => {
  res.status(200).json({
    project: 'Real-Time System for Land Acquisition',
    team: 'AYMK 2026 (Aastik, Yashmeet, Mann, Krishna)',
    apiVersion: 'v1',
    documentation: '/api/v1/health',
    dashboard: '/'
  });
});

// ============================================================================
// 3. ERROR HANDLING MIDDLEWARES
// ============================================================================
// 404 handler runs only if no previous route matched the request URL
app.use(notFoundHandler);

// Global error handler catches any uncaught exceptions and sends clean JSON
app.use(errorHandler);

module.exports = app;

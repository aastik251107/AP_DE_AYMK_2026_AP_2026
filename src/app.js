const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config');
const routes = require('./routes');
const loggerMiddleware = require('./middlewares/loggerMiddleware');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// ============================================================================
// Core Express Middlewares
// ============================================================================

// 1. Cross-Origin Resource Sharing
app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin,
    credentials: true // Allow cookies to pass across origins
  })
);

// 2. Request body parsing (Serialization / Deserialization)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Cookie parser (Authentication persistence & sessions)
app.use(cookieParser(config.cookieSecret));

// 4. Custom HTTP request logger
app.use(loggerMiddleware);

// 5. Static Routes (Public web UI dashboard and documentation)
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================================
// API Routing (Resource-Based & Versioned)
// ============================================================================
app.use('/api/v1', routes);

// Root path redirection or welcome info
app.get('/', (req, res) => {
  // If static public/index.html is present, express.static serves it;
  // this is a fallback JSON message
  res.status(200).json({
    project: 'Real-Time System for Land Acquisition',
    team: 'AYMK 2026 (Aastik, Yashmeet, Mann, Krishna)',
    apiVersion: 'v1',
    documentation: '/api/v1/health',
    dashboard: '/'
  });
});

// ============================================================================
// Error Handling Middlewares
// ============================================================================
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;

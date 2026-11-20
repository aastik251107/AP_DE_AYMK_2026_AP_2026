// ============================================================================
// 📋 HTTP REQUEST LOGGER MIDDLEWARE (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/middlewares/loggerMiddleware.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Express JS, Middlewares in Express, Express.js Request, Express.js Response"
//
// 💡 WHAT IS AN EXPRESS MIDDLEWARE? (THE "AIRPORT SECURITY" ANALOGY):
// Imagine going through an airport to catch a flight:
// 1. You first pass ID verification checkpoint.
// 2. Then baggage X-ray scanner checkpoint.
// 3. Finally, you reach your flight boarding gate.
//
// In Express, every incoming HTTP request travels through a chain of functions
// called "Middlewares". Each middleware receives three arguments:
//   `(req, res, next)`
// - `req`: The incoming request (HTTP method, URL, headers, body).
// - `res`: The outgoing response we will send back.
// - `next()`: A magic callback function that tells Express:
//   "I am finished with my check, pass this request to the NEXT middleware in line!"
//
// 💡 WHAT THIS LOGGER DOES:
// It intercepts every single incoming request, measures how many milliseconds
// the database took to answer, and prints a colored summary in your terminal!
// ============================================================================

const loggerMiddleware = (req, res, next) => {
  // Record the start timestamp in milliseconds
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  // The 'finish' event fires when Express finishes sending the response back to the client
  res.on('finish', () => {
    // Calculate total round-trip duration
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // ANSI Terminal Colors for beginner visual debugging:
    // Green (2xx success), Yellow (4xx client error), Red (5xx server error)
    const statusColor =
      statusCode >= 500 ? '\x1b[31m' : statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusColor}${statusCode}${resetColor} - ${duration}ms (${ip})`
    );
  });

  // CRITICAL: Always call next()! If you forget next(), the request hangs forever!
  next();
};

module.exports = loggerMiddleware;

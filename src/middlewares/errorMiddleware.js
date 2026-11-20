// ============================================================================
// ⚠️ CENTRALIZED ERROR HANDLING MIDDLEWARE (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/middlewares/errorMiddleware.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Express JS, Middlewares in Express, Express.js Response, HTTP Status Codes"
//
// 💡 WHY CENTRALIZED ERROR HANDLING?
// In a large project, controllers might crash (e.g. database disconnects, someone
// sends broken JSON, or a survey number is duplicated).
// If we don't catch these errors gracefully, the server crashes with a terrifying
// stack trace and the user gets a blank white screen!
//
// 💡 THE SPECIAL "4 ARGUMENTS" RULE IN EXPRESS:
// Normal Express middlewares take 3 arguments: `(req, res, next)`.
// But Express has a special rule: An ERROR-HANDLING middleware MUST take exactly
// 4 arguments: `(err, req, res, next)`.
// Express uses function reflection (`fn.length === 4`) to recognize it as the error catcher!
// ============================================================================

const { sendError } = require('../utils/apiResponse');

/**
 * 404 Catch-All Middleware:
 * Placed at the very end of all route definitions in app.js.
 * If a request reaches here, it means NO route in the entire app matched the URL!
 */
const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    404,
    `Route [${req.method}] ${req.originalUrl} does not exist on this server. Please check the API documentation.`
  );
};

/**
 * Global Error Handler:
 * Catches all unhandled errors thrown inside any controller or middleware.
 * Translates raw database/Prisma error codes into clean, beginner-friendly REST responses!
 */
const errorHandler = (err, req, res, next) => {
  console.error('💥 [Server Caught Error]:', err);

  // --------------------------------------------------------------------------
  // PRISMA ERROR CODE TRANSLATIONS (DATABASE CONSTRAINT MAPPING)
  // --------------------------------------------------------------------------

  // P2002: Unique Constraint Violated (e.g. Duplicate email or duplicate survey_number)
  if (err.code === 'P2002') {
    const fields = err.meta && err.meta.target ? err.meta.target : 'field';
    return sendError(
      res,
      409,
      `Conflict Error: A record with this ${fields} already exists in the database.`
    );
  }

  // P2025: Record to update/delete does not exist
  if (err.code === 'P2025') {
    return sendError(res, 404, 'The requested resource was not found in the database.');
  }

  // P2003: Foreign Key Constraint Failure (e.g. Trying to link to a non-existent parcel)
  if (err.code === 'P2003') {
    return sendError(
      res,
      400,
      'Foreign Key Error: The associated parent record (user, parcel, or project) does not exist.'
    );
  }

  // Malformed JSON body sent by the client
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Malformed JSON payload in request body.');
  }

  // Default to HTTP 500 Internal Server Error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  // In development, show error stack trace for debugging; in production hide it for security
  const debugDetails = process.env.NODE_ENV === 'development' ? err.stack : null;

  return sendError(res, statusCode, message, debugDetails);
};

module.exports = {
  notFoundHandler,
  errorHandler
};

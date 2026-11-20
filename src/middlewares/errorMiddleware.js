const { sendError } = require('../utils/apiResponse');

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    404,
    `Cannot find resource at [${req.method}] ${req.originalUrl}. Please check the API documentation.`
  );
};

/**
 * Centralized Error Handling Middleware
 * Converts uncaught application & Prisma ORM errors into clean RESTful JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  console.error('💥 Uncaught Application Error:', err);

  // Prisma Unique Constraint Violation (e.g. duplicate email, duplicate survey_number)
  if (err.code === 'P2002') {
    const fields = err.meta && err.meta.target ? err.meta.target : 'field';
    return sendError(res, 409, `Conflict: A record with this ${fields} already exists.`);
  }

  // Prisma Record Not Found in relation update/delete
  if (err.code === 'P2025') {
    return sendError(res, 404, 'The requested resource was not found in the database.');
  }

  // Prisma Foreign Key Constraint Failure
  if (err.code === 'P2003') {
    return sendError(res, 400, 'Foreign key constraint violated: Associated record does not exist.');
  }

  // JSON Syntax Error in incoming request body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Malformed JSON in request body payload.');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  return sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = {
  notFoundHandler,
  errorHandler
};

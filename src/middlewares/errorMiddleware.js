// Formats not-found and server error responses.

const { sendError } = require('../utils/apiResponse');
const notFoundHandler = (req, res, next) => {
  return sendError(
    res,
    404,
    `Route [${req.method}] ${req.originalUrl} does not exist on this server. Please check the API documentation.`
  );
};
const errorHandler = (err, req, res, next) => {
  console.error('💥 [Server Caught Error]:', err);


  if (err.code === 'P2002') {
    const fields = err.meta && err.meta.target ? err.meta.target : 'field';
    return sendError(
      res,
      409,
      `Conflict Error: A record with this ${fields} already exists in the database.`
    );
  }

  if (err.code === 'P2025') {
    return sendError(res, 404, 'The requested resource was not found in the database.');
  }

  if (err.code === 'P2003') {
    return sendError(
      res,
      400,
      'Foreign Key Error: The associated parent record (user, parcel, or project) does not exist.'
    );
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, 400, 'Malformed JSON payload in request body.');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  const debugDetails = process.env.NODE_ENV === 'development' ? err.stack : null;

  return sendError(res, statusCode, message, debugDetails);
};

module.exports = {
  notFoundHandler,
  errorHandler
};

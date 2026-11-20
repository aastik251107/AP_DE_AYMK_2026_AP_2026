/**
 * Standardized API Response Helper
 * Ensures consistent JSON serialization format across all endpoints:
 * {
 *   success: true/false,
 *   statusCode: 200,
 *   message: "...",
 *   data: {...},
 *   meta: {...}
 * }
 */

const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = {
    success: true,
    statusCode,
    message,
    data
  };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
};

const sendError = (res, statusCode = 500, message = 'Internal Server Error', errors = null) => {
  const response = {
    success: false,
    statusCode,
    message,
    errors
  };
  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};

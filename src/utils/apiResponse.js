// ============================================================================
// 📤 STANDARDIZED API RESPONSE HELPER (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/utils/apiResponse.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Serialization, HTTP Methods, HTTP Status Codes, API Headers, REST Architecture"
//
// 💡 WHAT IS JSON SERIALIZATION?
// In Node.js, data lives in memory as JavaScript objects: `{ name: "Ravi" }`.
// But the internet only understands plain text strings!
// "Serialization" is converting that JavaScript object into a JSON string:
// '{"name": "Ravi"}' so it can travel over the HTTP wire.
//
// 💡 WHY STANDARDIZE RESPONSES?
// If one endpoint returns `{ user: ... }`, another returns `{ result: ... }`,
// and another returns `{ data: ... }`, the frontend developers get very confused!
// By using these helper functions, EVERY response in our project has the EXACT
// same predictable structure:
// {
//   success: true / false,
//   statusCode: 200 / 201 / 400 / 404,
//   message: "Human friendly explanation",
//   data: {...}
// }
// ============================================================================

/**
 * Send a standardized SUCCESS response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (200 OK, 201 Created)
 * @param {string} message - Success description
 * @param {any} data - The actual payload (user, parcel, list of projects)
 * @param {object} meta - Optional pagination info or extra metadata
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

  // res.status(statusCode).json(response) serializes the object to JSON and sends HTTP headers
  return res.status(statusCode).json(response);
};

/**
 * Send a standardized ERROR response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP error code (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Server Error)
 * @param {string} message - Clear explanation of what went wrong
 * @param {any} errors - Detailed validation errors or debug stack trace
 */
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

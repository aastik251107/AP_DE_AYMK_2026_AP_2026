// ============================================================================
// 🔑 JWT & COOKIE AUTHENTICATION UTILITIES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/utils/token.js
// ============================================================================
// 💡 LECTURE TOPICS COVERED:
// - "Modern Authentication, Session Based Authentication, Token Based Authentication"
// - "Authentication Persistence, Cookies"
// - "Why Authentication? Authentication Factors, Authentication Flow"
//
// 💡 WHAT IS A JWT (JSON WEB TOKEN)? (THE "WRISTBAND" ANALOGY):
// Imagine going to an amusement park or concert:
// 1. You stand in line at the ticket counter with your ID proof (Login with password).
// 2. The staff verifies your ID and gives you a waterproof stamped WRISTBAND (JWT).
// 3. For the rest of the day, when you ride the rollercoasters, you don't show your
//    passport again—the security guards just glance at your tamper-proof wristband!
//
// 💡 WHAT ARE THE 3 PARTS OF A JWT?
// A JWT looks like: `aaaaa.bbbbb.ccccc`
// 1. Header: The algorithm used (e.g. HS256).
// 2. Payload: Safe public data we store inside (e.g. user id, email, role).
// 3. Signature: Cryptographic seal made using our secret key (`JWT_SECRET`).
//    If a user tries to edit their role from "OFFICER" to "ADMIN" inside the token,
//    the signature breaks and the server immediately rejects it!
//
// 💡 TOKEN VS COOKIE (WHY WE SUPPORT BOTH!):
// - Bearer Token in `Authorization` Header: Perfect for mobile apps, Postman, and automated tests.
// - HTTP-Only Cookie: Perfect for web browsers! It automatically persists across page refreshes,
//   and `httpOnly: true` guarantees that malicious hacker scripts cannot steal it!
// ============================================================================

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Sign (generate) a new JWT token containing user identity and role
 * @param {object} payload - { id: 1, name: "Officer Ravi", role: "OFFICER" }
 */
const signToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn // Token auto-expires after 7 days
  });
};

/**
 * Verify if an incoming JWT token is authentic and not expired
 * @param {string} token - The raw JWT string
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Send Token Response to Client:
 * 1. Sets an HTTP-Only Cookie on the response (for persistent browser sessions)
 * 2. Returns the token in the JSON body (for mobile apps / Postman / cURL)
 */
const sendTokenResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  // Create the token carrying essential user identity
  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  // Cookie options
  const cookieOptions = {
    // 💡 SECURITY REQUIREMENT:
    // httpOnly: true prevents client-side JavaScript (`document.cookie`) from accessing it!
    // This protects users against Cross-Site Scripting (XSS) token theft.
    httpOnly: true,

    // In production, enforce HTTPS transmission
    secure: config.nodeEnv === 'production',

    // SameSite Lax protects against Cross-Site Request Forgery (CSRF)
    sameSite: 'lax',

    // Max age: 7 days in milliseconds (7 * 24 * 60 * 60 * 1000)
    maxAge: 7 * 24 * 60 * 60 * 1000
  };

  // Set the cookie on the HTTP response headers
  res.cookie('auth_token', token, cookieOptions);

  // Strip out sensitive password hash before sending user profile back!
  const safeUserData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt
  };

  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data: {
      user: safeUserData,
      token // Provided so API clients can pass in 'Authorization: Bearer <token>'
    }
  });
};

/**
 * Clear the authentication cookie upon logout
 */
const clearTokenCookie = (res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax'
  });
};

module.exports = {
  signToken,
  verifyToken,
  sendTokenResponse,
  clearTokenCookie
};

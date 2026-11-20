const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Generate JSON Web Token (JWT)
 */
const signToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

/**
 * Verify JSON Web Token (JWT)
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};

/**
 * Send Token Response: Sets HTTP-Only Cookie AND returns Bearer Token
 * Demonstrates:
 * 1. Token-based authentication (Bearer in Auth header for mobile/API clients)
 * 2. Cookie-based authentication & persistence (HTTP-only cookie for browsers)
 */
const sendTokenResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  // Token payload contains user identification & role for fast authorization checks
  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  const cookieOptions = {
    httpOnly: true, // Prevents XSS attacks from accessing the token
    secure: config.nodeEnv === 'production', // Use HTTPS in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  };

  // Set the HTTP-Only cookie for persistence
  res.cookie('auth_token', token, cookieOptions);

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
      token
    }
  });
};

/**
 * Clear Authentication Cookie on Logout
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

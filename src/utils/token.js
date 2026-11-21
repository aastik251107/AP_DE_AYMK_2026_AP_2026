// Creates, verifies, and clears authentication tokens.

const jwt = require('jsonwebtoken');
const config = require('../config');
const signToken = (payload) => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn // Token auto-expires after 7 days
  });
};
const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret);
};
const sendTokenResponse = (user, statusCode, res, message = 'Authenticated successfully') => {
  // Create the token carrying essential user identity
  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  const cookieOptions = {
    httpOnly: true,

    secure: config.nodeEnv === 'production',

    sameSite: 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000
  };

  // Set the cookie on the HTTP response headers
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
      token // Provided so API clients can pass in 'Authorization: Bearer <token>'
    }
  });
};
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

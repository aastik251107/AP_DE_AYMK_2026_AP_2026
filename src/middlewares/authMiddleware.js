const { verifyToken } = require('../utils/token');
const { sendError } = require('../utils/apiResponse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Authentication Middleware
 * Validates JWT from either:
 * 1. 'Authorization: Bearer <token>' Header (REST API Standard)
 * 2. 'auth_token' Cookie (Browser / Session Persistence Standard)
 */
const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check Authorization Header (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fallback to HTTP-only Cookie
    else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return sendError(res, 401, 'Access denied. No authentication token provided.');
    }

    // Verify token signature and expiry
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return sendError(res, 401, 'Invalid or expired authentication token. Please log in again.');
    }

    // Fetch latest user details from database to ensure account is active and role is fresh
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ownerProfile: true }
    });

    if (!user) {
      return sendError(res, 401, 'User associated with this token no longer exists.');
    }

    // Attach user to Express request context
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return sendError(res, 500, 'Authentication error during token verification.');
  }
};

module.exports = {
  authenticate
};

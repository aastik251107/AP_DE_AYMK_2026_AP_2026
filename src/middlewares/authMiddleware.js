// Authenticates requests using a token.

const { verifyToken } = require('../utils/token');
const { sendError } = require('../utils/apiResponse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    if (!token) {
      return sendError(
        res,
        401,
        'Access denied. No authentication token provided. Please log in first.'
      );
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      // If expired or tampered with, jwt.verify throws an error
      return sendError(
        res,
        401,
        'Invalid or expired authentication token. Please log in again.'
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ownerProfile: true }
    });

    if (!user) {
      return sendError(res, 401, 'User account associated with this token no longer exists.');
    }

    req.user = user;

    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return sendError(res, 500, 'Internal authentication error during token verification.');
  }
};

module.exports = {
  authenticate
};

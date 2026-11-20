// ============================================================================
// 🛡️ AUTHENTICATION MIDDLEWARE (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/middlewares/authMiddleware.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Authentication, Why Authentication?, Authentication Factors, Authentication flow"
// "Modern Authentication, Session Based Authentication, Token Based Authentication"
//
// 💡 WHAT IS AUTHENTICATION?
// Authentication answers the question: "WHO ARE YOU?"
// It verifies that the user is really who they claim to be.
//
// 💡 HOW THIS MIDDLEWARE WORKS (STEP-BY-STEP):
// 1. Checks if the client sent an 'Authorization: Bearer <token>' header.
// 2. If not found in headers, checks if the browser sent an 'auth_token' cookie.
// 3. If no token exists at all -> Return HTTP 401 (Unauthorized: Please log in!).
// 4. Verifies the cryptographic signature of the token using JWT_SECRET.
// 5. Looks up the user in the Prisma database to ensure their account is active.
// 6. Attaches `req.user = user` to the request object!
//    This allows all downstream controllers to immediately know who is making
//    the request (e.g. `req.user.id`, `req.user.role`)!
// ============================================================================

const { verifyToken } = require('../utils/token');
const { sendError } = require('../utils/apiResponse');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // STEP 1: Check Authorization Header (Standard for REST APIs & Mobile Apps)
    // The format is: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // STEP 2: Fallback to HTTP-only Cookie (Standard for Web Browsers)
    else if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }

    // STEP 3: If no token was provided anywhere, reject request
    if (!token) {
      return sendError(
        res,
        401,
        'Access denied. No authentication token provided. Please log in first.'
      );
    }

    // STEP 4: Cryptographically verify the token
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

    // STEP 5: Query Prisma database to ensure user still exists and load their role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { ownerProfile: true }
    });

    if (!user) {
      return sendError(res, 401, 'User account associated with this token no longer exists.');
    }

    // STEP 6: Attach the authenticated user to the Express request object
    // Now any controller downstream can read `req.user`!
    req.user = user;

    // Move forward to the next middleware or controller
    next();
  } catch (error) {
    console.error('Authentication Middleware Error:', error);
    return sendError(res, 500, 'Internal authentication error during token verification.');
  }
};

module.exports = {
  authenticate
};

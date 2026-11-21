// ============================================================================
// 🔐 AUTHENTICATION CONTROLLER (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/controllers/authController.js
// ============================================================================
// 💡 LECTURE TOPICS COVERED:
// - "Authentication, Why Authentication?, Authentication Factors, Authentication flow"
// - "Modern Authentication, Session Based Authentication, Token Based Authentication"
// - "Authentication Persistence, Cookies"
//
// 💡 WHAT DOES A CONTROLLER DO IN MVC?
// In MVC (Model-View-Controller) architecture:
// - Models: Represent the database (Prisma).
// - Views: Represent what the user sees (HTML/JSON).
// - Controllers: The "Brain" in the middle! It receives the request, validates input,
//   calls the database, and decides what response to send back!
// ============================================================================

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendTokenResponse, clearTokenCookie } = require('../utils/token');

const prisma = new PrismaClient();

/**
 * 1. REGISTER A NEW USER
 * POST /api/v1/auth/register
 * Body: { name, email, password, phone?, idNumber? }
 * Public registration always creates an OWNER account; only an Admin can assign ADMIN access.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, idNumber } = req.body;

    // STEP 1: Basic validation of mandatory fields
    if (!name || !email || !password) {
      return sendError(res, 400, 'Please provide name, email, and password.');
    }

    // STEP 2: Check if email is already taken
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 409, 'An account with this email address already exists.');
    }

    // STEP 3: Cryptographically hash password with bcrypt
    // Salt rounds: 10 is the industry standard balance of security and speed
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate role (Default to OWNER if not specified)
    // Public registration always creates a landowner account. Admin roles are assigned separately.
    const userRole = 'OWNER';

    // STEP 4: Insert the user into Prisma database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole
      }
    });

    // STEP 5: If the user is a citizen Landowner and provided an ID number, link their Owner profile
    if (userRole === 'OWNER' && idNumber) {
      await prisma.owner.upsert({
        where: { idNumber },
        update: { userId: user.id, fullName: name, phone: phone || '' },
        create: {
          fullName: name,
          phone: phone || '',
          idNumber,
          userId: user.id
        }
      });
    }

    // STEP 6: Automatically log the user in by issuing a JWT and setting a cookie!
    return sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 2. LOGIN USER
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // STEP 1: Validate input
    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password.');
    }

    // STEP 2: Find user by email in database
    const user = await prisma.user.findUnique({
      where: { email },
      include: { ownerProfile: true }
    });

    // If user does not exist
    if (!user) {
      // 💡 SECURITY TIP: Always say "Invalid email or password" (generic message)
      // so attackers cannot guess which emails are registered on the platform!
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    // STEP 3: Compare plain password with the bcrypt hashed password
    // 💡 WHY NOT `password === user.password`?
    // Because `user.password` is a bcrypt hash! `bcrypt.compare` re-hashes the
    // incoming password with the salt and compares the cryptographic hashes!
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    // STEP 4: Success! Issue JWT token and set HTTP-only cookie
    return sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * 3. LOGOUT USER
 * POST /api/v1/auth/logout
 * Clears the HTTP-only cookie session
 */
const logout = async (req, res) => {
  clearTokenCookie(res);
  return sendSuccess(res, 200, 'Logged out successfully. Authentication cookie cleared.');
};

/**
 * 4. GET CURRENTLY LOGGED IN USER PROFILE
 * GET /api/v1/auth/me
 * Requires: 'authenticate' middleware
 */
const getMe = async (req, res) => {
  // `req.user` was already attached by our authenticate middleware!
  const user = {
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    ownerProfile: req.user.ownerProfile,
    createdAt: req.user.createdAt
  };
  return sendSuccess(res, 200, 'Current authenticated user profile', user);
};

module.exports = {
  register,
  login,
  logout,
  getMe
};

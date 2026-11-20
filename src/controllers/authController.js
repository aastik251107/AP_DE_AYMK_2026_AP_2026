const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendTokenResponse, clearTokenCookie } = require('../utils/token');

const prisma = new PrismaClient();

/**
 * Register a new User
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, idNumber } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Please provide name, email, and password.');
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    // Hash password with salt rounds
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in database
    const userRole = ['ADMIN', 'OFFICER', 'OWNER'].includes(role) ? role : 'OWNER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole
      }
    });

    // If registered as OWNER and citizen ID provided, link or create Owner profile
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

    return sendTokenResponse(user, 201, res, 'User registered successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Login User
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password.');
    }

    // Retrieve user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { ownerProfile: true }
    });

    if (!user) {
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    return sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout User
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
  clearTokenCookie(res);
  return sendSuccess(res, 200, 'Logged out successfully. Cookie cleared.');
};

/**
 * Get Currently Authenticated User
 * GET /api/v1/auth/me
 */
const getMe = async (req, res) => {
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

/**
 * Educational OAuth 2.0 Flow Simulation
 * GET /api/v1/auth/oauth/google-demo
 * Demonstrates:
 * 1. OAuth 2.0 Authorization Code Grant
 * 2. Token Exchange (client_id, client_secret, code -> access_token)
 * 3. Resource Server Profile Retrieval
 */
const oauthSimulate = async (req, res) => {
  const { code, mockRole } = req.query;

  // Step 1: If no code, explain and return simulated OAuth Consent URL
  if (!code) {
    return sendSuccess(res, 200, 'OAuth 2.0 Authorization URL Generator (Simulated)', {
      flow: 'OAuth 2.0 Authorization Code Flow',
      authorizationUrl: '/api/v1/auth/oauth/google-demo?code=mock_gov_auth_code_98765&mockRole=OFFICER',
      steps: [
        '1. Client redirects user to Identity Provider (Google / Digital India OAuth)',
        '2. User logs in and grants consent for permissions (profile, email)',
        '3. Identity Provider redirects back with authorization code',
        '4. Backend exchanges authorization code with Identity Provider for Access Token',
        '5. Backend retrieves user info and issues application JWT/Cookie session'
      ]
    });
  }

  // Step 2: Handle simulated callback exchange
  const simulatedGoogleUser = {
    name: 'National Land Officer (OAuth)',
    email: 'officer.oauth@ap.gov.in',
    googleId: 'google-sub-1029384756',
    role: mockRole === 'ADMIN' ? 'ADMIN' : 'OFFICER'
  };

  // Upsert user into database
  const user = await prisma.user.upsert({
    where: { email: simulatedGoogleUser.email },
    update: { name: simulatedGoogleUser.name },
    create: {
      name: simulatedGoogleUser.name,
      email: simulatedGoogleUser.email,
      password: await bcrypt.hash('oauth_dummy_password', 10),
      role: simulatedGoogleUser.role
    }
  });

  return sendTokenResponse(user, 200, res, 'OAuth 2.0 login simulation completed successfully');
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  oauthSimulate
};

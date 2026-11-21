// Handles user registration, login, and logout.

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const { sendTokenResponse, clearTokenCookie } = require('../utils/token');

const prisma = new PrismaClient();
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, idNumber } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 400, 'Please provide name, email, and password.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return sendError(res, 409, 'An account with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Validate role (Default to OWNER if not specified)
    const userRole = 'OWNER';

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole
      }
    });

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
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Please provide both email and password.');
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { ownerProfile: true }
    });

    // If user does not exist
    if (!user) {
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password credentials.');
    }

    return sendTokenResponse(user, 200, res, 'Logged in successfully');
  } catch (error) {
    next(error);
  }
};
const logout = async (req, res) => {
  clearTokenCookie(res);
  return sendSuccess(res, 200, 'Logged out successfully. Authentication cookie cleared.');
};
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

module.exports = {
  register,
  login,
  logout,
  getMe
};

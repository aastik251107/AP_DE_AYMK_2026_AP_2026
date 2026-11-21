// ============================================================================
// 👥 USER MANAGEMENT CONTROLLER (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/controllers/userController.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Authorisation, Role Based Authorisation, Prisma CRUD Operations"
//
// 💡 WHAT THIS CONTROLLER DOES:
// Allows System Administrators to view users and assign ADMIN or OWNER roles.
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const prisma = new PrismaClient();

/**
 * 1. GET ALL USERS (ADMIN ONLY)
 * GET /api/v1/users
 * 
 * 💡 PRISMA 'SELECT' PROJECTION:
 * Notice we use `select: { id: true, name: true, password: false }`.
 * We deliberately EXCLUDE the password hash from the SQL query so sensitive
 * data is never exposed in the response!
 */
const getAllUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        ownerProfile: true
      },
      orderBy: { id: 'asc' }
    });

    return sendSuccess(res, 200, 'Users retrieved successfully', users);
  } catch (error) {
    next(error);
  }
};

/**
 * 2. GET USER PROFILE BY ID
 * GET /api/v1/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        ownerProfile: true,
        acquisitionsCreated: {
          select: { id: true, status: true, createdAt: true }
        }
      }
    });

    if (!user) {
      return sendError(res, 404, `User with ID ${userId} not found.`);
    }

    return sendSuccess(res, 200, 'User profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

/**
 * 3. UPDATE USER ROLE (ADMIN ONLY)
 * PATCH /api/v1/users/:id/role
 * Body: { role: "ADMIN" | "OWNER" }
 */
const updateUserRole = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    // Validate that the requested role is a valid enum value
    if (!['ADMIN', 'OWNER'].includes(role)) {
      return sendError(res, 400, 'Invalid role. Must be one of: ADMIN, OWNER.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    return sendSuccess(res, 200, `User role successfully updated to ${role}`, updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole
};

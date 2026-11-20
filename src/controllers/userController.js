const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const prisma = new PrismaClient();

/**
 * Get all users (Admin only)
 * GET /api/v1/users
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
 * Get user by ID
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
 * Update user role (Admin only)
 * PATCH /api/v1/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body;

    if (!['ADMIN', 'OFFICER', 'OWNER'].includes(role)) {
      return sendError(res, 400, 'Invalid role. Must be ADMIN, OFFICER, or OWNER.');
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true }
    });

    return sendSuccess(res, 200, `User role updated to ${role}`, updatedUser);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole
};

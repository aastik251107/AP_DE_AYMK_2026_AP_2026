// ============================================================================
// 🛣️ USER & ROLE ROUTES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/routes/userRoutes.js
// Mounted under: /api/v1/users
// ============================================================================
// 💡 MIDDLEWARE CHAINING:
// Notice: `authenticate, authorize('ADMIN'), getAllUsers`
// 1. `authenticate` checks: Is the user logged in?
// 2. `authorize('ADMIN')` checks: Is their role ADMIN?
// 3. `getAllUsers` only runs if BOTH checks pass!
// ============================================================================

const express = require('express');
const { getAllUsers, getUserById, updateUserRole } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

// List all users (Admin only)
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);

// Get single user profile (Authenticated users)
router.get('/:id', authenticate, getUserById);

// Update user role (Admin only)
router.patch('/:id/role', authenticate, authorize('ADMIN'), updateUserRole);

module.exports = router;

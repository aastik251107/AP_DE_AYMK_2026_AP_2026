// Defines user administration routes.

const express = require('express');
const { getAllUsers, getUserById, updateUserRole } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), getAllUsers);

router.get('/:id', authenticate, getUserById);

// Update user role (Admin only)
router.patch('/:id/role', authenticate, authorize('ADMIN'), updateUserRole);

module.exports = router;

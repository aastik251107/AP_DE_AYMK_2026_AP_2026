const express = require('express');
const { getAllUsers, getUserById, updateUserRole } = require('../controllers/userController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

/**
 * User & Role Management Endpoints (Admin Controlled)
 * Base Path: /api/v1/users
 */
router.get('/', authenticate, authorize('ADMIN'), getAllUsers);
router.get('/:id', authenticate, getUserById);
router.patch('/:id/role', authenticate, authorize('ADMIN'), updateUserRole);

module.exports = router;

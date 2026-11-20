const express = require('express');
const { register, login, logout, getMe, oauthSimulate } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

/**
 * Authentication Endpoints
 * Base Path: /api/v1/auth
 */
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);
router.get('/oauth/google-demo', oauthSimulate);

module.exports = router;

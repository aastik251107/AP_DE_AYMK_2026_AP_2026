// ============================================================================
// 🛣️ AUTHENTICATION ROUTES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/routes/authRoutes.js
// ============================================================================
// 💡 WHAT IS AN EXPRESS ROUTER?
// Instead of writing all 50 endpoints inside one giant app.js file,
// an Express Router lets us split routes by resource into small, modular files!
//
// Mounted under: /api/v1/auth
// ============================================================================

const express = require('express');
const { register, login, logout, getMe } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

const router = express.Router();

// Public Endpoints (Anyone can access)
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected Endpoint (Requires valid JWT token or cookie session)
// Notice how `authenticate` runs BEFORE `getMe`!
router.get('/me', authenticate, getMe);

module.exports = router;

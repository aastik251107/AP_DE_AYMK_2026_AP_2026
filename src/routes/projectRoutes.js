// ============================================================================
// 🛣️ INFRASTRUCTURE PROJECT ROUTES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/routes/projectRoutes.js
// Mounted under: /api/v1/projects
// ============================================================================

const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject
} = require('../controllers/projectController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Publicly viewable project schemes
router.get('/', getProjects);
router.get('/:id', getProjectById);

// Staff-only mutation actions
router.post('/', authenticate, authorize('ADMIN'), createProject);
router.put('/:id', authenticate, authorize('ADMIN'), updateProject);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteProject);

module.exports = router;

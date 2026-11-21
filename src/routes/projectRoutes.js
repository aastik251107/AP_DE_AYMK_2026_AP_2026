// Defines infrastructure project API routes.

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

router.get('/', getProjects);
router.get('/:id', getProjectById);

router.post('/', authenticate, authorize('ADMIN'), createProject);
router.put('/:id', authenticate, authorize('ADMIN'), updateProject);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteProject);

module.exports = router;

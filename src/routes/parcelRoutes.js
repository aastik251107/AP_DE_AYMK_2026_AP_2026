// ============================================================================
// 🛣️ CADASTRAL PARCEL & OWNER ROUTES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/routes/parcelRoutes.js
// Mounted under: /api/v1/parcels
// ============================================================================

const express = require('express');
const {
  createParcel,
  getParcels,
  getMyParcels,
  getParcelById,
  assignOwnerShare,
  registerOwner,
  getOwnersList
} = require('../controllers/parcelController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Cadastral registry reads
router.get('/owners/list', authenticate, authorize('ADMIN'), getOwnersList);
router.get('/mine', authenticate, authorize('OWNER'), getMyParcels);
router.get('/', authenticate, authorize('ADMIN'), getParcels);
router.get('/:id', authenticate, getParcelById);

// Cadastral mutations (Admin only)
router.post('/', authenticate, authorize('ADMIN'), createParcel);
router.post('/owners/register', authenticate, authorize('ADMIN'), registerOwner);
router.post('/:id/owners', authenticate, authorize('ADMIN'), assignOwnerShare);

module.exports = router;

// ============================================================================
// 🛣️ CADASTRAL PARCEL & OWNER ROUTES (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/routes/parcelRoutes.js
// Mounted under: /api/v1/parcels
// ============================================================================

const express = require('express');
const {
  createParcel,
  getParcels,
  getParcelById,
  assignOwnerShare,
  registerOwner,
  getOwnersList
} = require('../controllers/parcelController');
const { authenticate } = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');

const router = express.Router();

// Cadastral registry reads
router.get('/', getParcels);
router.get('/owners/list', getOwnersList);
router.get('/:id', getParcelById);

// Cadastral mutations (Admin and Revenue Officers only)
router.post('/', authenticate, authorize('ADMIN', 'OFFICER'), createParcel);
router.post('/owners/register', authenticate, authorize('ADMIN', 'OFFICER'), registerOwner);
router.post('/:id/owners', authenticate, authorize('ADMIN', 'OFFICER'), assignOwnerShare);

module.exports = router;

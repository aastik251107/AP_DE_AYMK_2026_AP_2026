// ============================================================================
// 👮 ROLE-BASED ACCESS CONTROL (RBAC) MIDDLEWARE (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: src/middlewares/roleMiddleware.js
// ============================================================================
// 💡 LECTURE TOPIC:
// "Authorisation, Role Based Authorisation, Authorisation Middleware"
//
// 💡 AUTHENTICATION VS AUTHORIZATION (THE "COLLEGE ID" ANALOGY):
// - AUTHENTICATION: The security guard at the college gate checks your ID card.
//   He verifies you are a real student. (HTTP 401 if you don't have an ID).
// - AUTHORIZATION: You try to open the confidential Teacher's Exam Room.
//   Even though you are a verified student, the guard stops you and says:
//   "You are a Student, only Professors and HOD are permitted inside!" (HTTP 403 Forbidden).
//
// 💡 OUR ROLES IN LAND ACQUISITION:
// 1. ADMIN: Manages projects, parcels, acquisitions, payments, and landowner queries.
// 2. OWNER: Citizens who can view their own payments and queries, and file queries.
// ============================================================================

const { sendError } = require('../utils/apiResponse');

/**
 * Higher-Order Middleware Factory:
 * Returns an Express middleware that checks if the logged-in user holds
 * one of the required roles.
 * 
 * Example usage in routes:
 *   router.post('/projects', authenticate, authorize('ADMIN'), createProject);
 *   router.post('/acquisitions', authenticate, authorize('ADMIN'), createAcquisition);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Safety check: ensure authenticate middleware ran first
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

    // Check if the user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      // 💡 LECTURE TOPIC: HTTP 403 Forbidden vs 401 Unauthorized
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required role: [${allowedRoles.join(', ')}]`
      );
    }

    // Access granted! Proceed to controller.
    next();
  };
};

/**
 * Fine-Grained Ownership Guard:
 * Checks whether the logged-in user is an ADMIN,
 * OR the specific Citizen Landowner who owns this particular record.
 * (A farmer in Kurnool should NOT be able to view another farmer's private compensation records!).
 */
const requireOwnerOrAdmin = (getOwnerIdFromReq) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

    // Administrators have system-wide authorized access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    // If Citizen OWNER, ensure their linked profile matches the target record
    const targetOwnerId = Number(getOwnerIdFromReq(req));
    const userOwnerId = req.user.ownerProfile ? req.user.ownerProfile.id : null;

    if (!userOwnerId || userOwnerId !== targetOwnerId) {
      return sendError(
        res,
        403,
        'Forbidden: You are only permitted to access your own personal landowner records.'
      );
    }

    next();
  };
};

module.exports = {
  authorize,
  requireOwnerOrAdmin
};

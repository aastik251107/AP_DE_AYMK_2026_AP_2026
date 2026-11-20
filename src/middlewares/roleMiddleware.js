const { sendError } = require('../utils/apiResponse');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific authorized user roles.
 * 
 * Usage:
 *   router.post('/projects', authenticate, authorize('ADMIN'), createProject);
 *   router.post('/acquisitions', authenticate, authorize('ADMIN', 'OFFICER'), createAcquisition);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};

/**
 * Checks whether the current user is an ADMIN, OFFICER,
 * or the specific Landowner who owns the target resource.
 */
const requireOwnerOrStaff = (getOwnerIdFromReq) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

    // Admins and Officers have system-wide access
    if (req.user.role === 'ADMIN' || req.user.role === 'OFFICER') {
      return next();
    }

    // If citizen OWNER, ensure their linked owner id matches the requested owner id
    const targetOwnerId = Number(getOwnerIdFromReq(req));
    const userOwnerId = req.user.ownerProfile ? req.user.ownerProfile.id : null;

    if (!userOwnerId || userOwnerId !== targetOwnerId) {
      return sendError(res, 403, 'Forbidden: You are only permitted to access your own landowner records.');
    }

    next();
  };
};

module.exports = {
  authorize,
  requireOwnerOrStaff
};

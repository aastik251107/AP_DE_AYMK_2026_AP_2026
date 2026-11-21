// Restricts routes to authorized roles.

const { sendError } = require('../utils/apiResponse');
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

    // Check if the user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        403,
        `Forbidden: Role '${req.user.role}' is not authorized to perform this action. Required role: [${allowedRoles.join(', ')}]`
      );
    }

    next();
  };
};
const requireOwnerOrAdmin = (getOwnerIdFromReq) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized: User is not authenticated.');
    }

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

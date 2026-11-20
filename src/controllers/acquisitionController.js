const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const eventBus = require('../services/eventBus');

const prisma = new PrismaClient();

// Valid state machine transitions
const VALID_TRANSITIONS = {
  PROPOSED: ['NOTIFIED'],
  NOTIFIED: ['VALUATED', 'PROPOSED'],
  VALUATED: ['COMPENSATED', 'NOTIFIED'],
  COMPENSATED: ['COMPLETED', 'VALUATED'],
  COMPLETED: []
};

/**
 * Initiate a new Land Acquisition Workflow
 * POST /api/v1/acquisitions
 * Access: ADMIN, OFFICER
 */
const createAcquisition = async (req, res, next) => {
  try {
    const { parcelId, projectId } = req.body;

    if (!parcelId || !projectId) {
      return sendError(res, 400, 'Please provide parcelId and projectId.');
    }

    const pId = Number(parcelId);
    const prId = Number(projectId);

    // Verify parcel and project exist
    const [parcel, project] = await Promise.all([
      prisma.parcel.findUnique({
        where: { id: pId },
        include: { parcelOwners: true }
      }),
      prisma.project.findUnique({ where: { id: prId } })
    ]);

    if (!parcel) return sendError(res, 404, `Parcel #${pId} not found.`);
    if (!project) return sendError(res, 404, `Project #${prId} not found.`);

    if (parcel.parcelOwners.length === 0) {
      return sendError(res, 400, `Cannot acquire parcel #${pId}: No owners assigned yet.`);
    }

    // Check if parcel is already being acquired for this project
    const existing = await prisma.acquisition.findUnique({
      where: {
        uq_parcel_project: {
          parcelId: pId,
          projectId: prId
        }
      }
    });

    if (existing) {
      return sendError(
        res,
        409,
        `Acquisition already exists for parcel #${pId} and project #${prId} (Acquisition #${existing.id}, Status: ${existing.status}).`
      );
    }

    // Create acquisition record with default status PROPOSED
    const acquisition = await prisma.acquisition.create({
      data: {
        parcelId: pId,
        projectId: prId,
        status: 'PROPOSED',
        createdById: req.user.id
      },
      include: {
        parcel: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } }
      }
    });

    // Create initial audit history record
    await prisma.statusHistory.create({
      data: {
        acquisitionId: acquisition.id,
        oldStatus: null,
        newStatus: 'PROPOSED',
        changedById: req.user.id
      }
    });

    // Emit Real-Time Domain Event
    eventBus.emitEvent('acquisition:created', {
      acquisitionId: acquisition.id,
      parcelId: pId,
      surveyNumber: parcel.surveyNumber,
      projectName: project.name,
      status: 'PROPOSED',
      officer: req.user.name
    });

    return sendSuccess(res, 201, 'Land acquisition workflow initiated', acquisition);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Acquisitions with Relational Filtering
 * GET /api/v1/acquisitions
 * Filters: status, projectId, village, officerId
 */
const getAcquisitions = async (req, res, next) => {
  try {
    const { status, projectId, village } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (projectId) {
      where.projectId = Number(projectId);
    }
    if (village) {
      where.parcel = {
        village: { contains: village }
      };
    }

    const acquisitions = await prisma.acquisition.findMany({
      where,
      include: {
        parcel: {
          include: {
            parcelOwners: {
              include: { owner: true }
            }
          }
        },
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: { compensations: true, objections: true, statusHistory: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return sendSuccess(res, 200, 'Acquisitions retrieved successfully', acquisitions);
  } catch (error) {
    next(error);
  }
};

/**
 * Get detailed Acquisition by ID
 * GET /api/v1/acquisitions/:id
 */
const getAcquisitionById = async (req, res, next) => {
  try {
    const acquisitionId = Number(req.params.id);

    const acquisition = await prisma.acquisition.findUnique({
      where: { id: acquisitionId },
      include: {
        parcel: {
          include: {
            parcelOwners: {
              include: { owner: true }
            }
          }
        },
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        compensations: {
          include: { owner: true }
        },
        objections: {
          include: { owner: true }
        },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { changedAt: 'asc' }
        }
      }
    });

    if (!acquisition) {
      return sendError(res, 404, `Acquisition #${acquisitionId} not found.`);
    }

    return sendSuccess(res, 200, 'Acquisition workflow details', acquisition);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Acquisition Status (Workflow Engine State Machine Transition)
 * PATCH /api/v1/acquisitions/:id/status
 * Access: ADMIN, OFFICER
 */
const updateStatus = async (req, res, next) => {
  try {
    const acquisitionId = Number(req.params.id);
    const { newStatus } = req.body;

    const validStatuses = ['PROPOSED', 'NOTIFIED', 'VALUATED', 'COMPENSATED', 'COMPLETED'];
    if (!validStatuses.includes(newStatus)) {
      return sendError(
        res,
        400,
        `Invalid status '${newStatus}'. Must be one of: [${validStatuses.join(', ')}]`
      );
    }

    const currentAcquisition = await prisma.acquisition.findUnique({
      where: { id: acquisitionId },
      include: {
        parcel: {
          include: { parcelOwners: { include: { owner: true } } }
        },
        project: true,
        compensations: true,
        objections: true
      }
    });

    if (!currentAcquisition) {
      return sendError(res, 404, `Acquisition #${acquisitionId} not found.`);
    }

    const oldStatus = currentAcquisition.status;

    if (oldStatus === newStatus) {
      return sendError(res, 400, `Acquisition #${acquisitionId} is already in status '${newStatus}'.`);
    }

    // State machine check
    const allowedNext = VALID_TRANSITIONS[oldStatus] || [];
    if (!allowedNext.includes(newStatus) && req.user.role !== 'ADMIN') {
      return sendError(
        res,
        400,
        `Illegal workflow transition from '${oldStatus}' to '${newStatus}'. Permitted transitions: [${allowedNext.join(
          ', '
        )}]`
      );
    }

    // Business Rule: Cannot complete if there are unresolved open objections!
    if (newStatus === 'COMPLETED') {
      const openObjections = currentAcquisition.objections.filter(
        (o) => o.status === 'OPEN' || o.status === 'UNDER_REVIEW'
      );
      if (openObjections.length > 0) {
        return sendError(
          res,
          400,
          `Cannot mark acquisition as COMPLETED: There are ${openObjections.length} pending objection(s) that must be resolved first.`
        );
      }

      // Check if all compensations are paid
      const unpaidCompensations = currentAcquisition.compensations.filter(
        (c) => c.paymentStatus !== 'PAID'
      );
      if (unpaidCompensations.length > 0) {
        return sendError(
          res,
          400,
          `Cannot mark acquisition as COMPLETED: ${unpaidCompensations.length} compensation payout(s) are still pending.`
        );
      }
    }

    // Business Rule: When advancing to VALUATED, auto-generate compensations for all owners if not already generated!
    if (newStatus === 'VALUATED' && currentAcquisition.compensations.length === 0) {
      const { areaSqm, marketRatePerSqm } = currentAcquisition.parcel;
      const totalValuation = areaSqm * marketRatePerSqm;

      for (const po of currentAcquisition.parcel.parcelOwners) {
        const ownerAmount = totalValuation * (po.sharePercent / 100);
        await prisma.compensation.create({
          data: {
            acquisitionId,
            ownerId: po.ownerId,
            amount: ownerAmount,
            paymentStatus: 'PENDING'
          }
        });
      }
      console.log(`💰 Auto-generated compensations for Acquisition #${acquisitionId}`);
    }

    // Update acquisition status
    const updated = await prisma.acquisition.update({
      where: { id: acquisitionId },
      data: { status: newStatus },
      include: {
        parcel: true,
        project: true,
        compensations: true,
        objections: true
      }
    });

    // Record immutable audit history
    await prisma.statusHistory.create({
      data: {
        acquisitionId,
        oldStatus,
        newStatus,
        changedById: req.user.id
      }
    });

    // Emit Real-Time Domain Event to EventBus
    eventBus.emitEvent('acquisition:status_changed', {
      acquisitionId,
      parcelSurvey: currentAcquisition.parcel.surveyNumber,
      projectName: currentAcquisition.project.name,
      oldStatus,
      newStatus,
      updatedBy: req.user.name,
      updatedByRole: req.user.role
    });

    return sendSuccess(res, 200, `Acquisition status transitioned to '${newStatus}'`, updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAcquisition,
  getAcquisitions,
  getAcquisitionById,
  updateStatus
};

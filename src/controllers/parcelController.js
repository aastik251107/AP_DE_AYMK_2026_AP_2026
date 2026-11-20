const { PrismaClient } = require('@prisma/client');
const { sendSuccess, sendError } = require('../utils/apiResponse');

const prisma = new PrismaClient();

/**
 * Create a new Land Parcel
 * POST /api/v1/parcels
 * Access: ADMIN, OFFICER
 */
const createParcel = async (req, res, next) => {
  try {
    const { surveyNumber, village, areaSqm, marketRatePerSqm, owners } = req.body;

    if (!surveyNumber || !village || areaSqm === undefined || marketRatePerSqm === undefined) {
      return sendError(res, 400, 'Please provide surveyNumber, village, areaSqm, and marketRatePerSqm.');
    }

    const area = parseFloat(areaSqm);
    const rate = parseFloat(marketRatePerSqm);

    if (area <= 0 || rate <= 0) {
      return sendError(res, 400, 'Area (sqm) and market rate must be greater than zero.');
    }

    // Check unique survey number
    const existing = await prisma.parcel.findUnique({
      where: { surveyNumber }
    });
    if (existing) {
      return sendError(res, 409, `A parcel with survey number '${surveyNumber}' is already registered.`);
    }

    const parcel = await prisma.parcel.create({
      data: {
        surveyNumber,
        village,
        areaSqm: area,
        marketRatePerSqm: rate
      }
    });

    // Optionally assign initial owners if supplied in request body: [{ ownerId: 1, sharePercent: 100 }]
    if (Array.isArray(owners) && owners.length > 0) {
      let totalShare = 0;
      for (const o of owners) {
        totalShare += parseFloat(o.sharePercent);
      }
      if (totalShare > 100) {
        return sendError(res, 400, `Total ownership share (${totalShare}%) exceeds 100%.`);
      }

      for (const o of owners) {
        await prisma.parcelOwner.create({
          data: {
            parcelId: parcel.id,
            ownerId: Number(o.ownerId),
            sharePercent: parseFloat(o.sharePercent)
          }
        });
      }
    }

    const result = await prisma.parcel.findUnique({
      where: { id: parcel.id },
      include: {
        parcelOwners: {
          include: { owner: true }
        }
      }
    });

    return sendSuccess(res, 201, 'Land parcel registered successfully in cadastral registry', result);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Parcels with filtering
 * GET /api/v1/parcels
 * Query params: village, minArea, maxRate, search
 */
const getParcels = async (req, res, next) => {
  try {
    const { village, search, minArea, maxRate } = req.query;

    const where = {};
    if (village) {
      where.village = { contains: village };
    }
    if (search) {
      where.surveyNumber = { contains: search };
    }
    if (minArea) {
      where.areaSqm = { gte: parseFloat(minArea) };
    }
    if (maxRate) {
      where.marketRatePerSqm = { lte: parseFloat(maxRate) };
    }

    const parcels = await prisma.parcel.findMany({
      where,
      include: {
        parcelOwners: {
          include: {
            owner: {
              select: { id: true, fullName: true, phone: true, idNumber: true }
            }
          }
        },
        acquisitions: {
          select: { id: true, status: true, project: { select: { id: true, name: true } } }
        }
      },
      orderBy: { id: 'asc' }
    });

    // Enrich each parcel with computed Total Value
    const enriched = parcels.map((p) => ({
      ...p,
      totalValuation: p.areaSqm * p.marketRatePerSqm
    }));

    return sendSuccess(res, 200, 'Parcels retrieved successfully', enriched);
  } catch (error) {
    next(error);
  }
};

/**
 * Get Parcel by ID
 * GET /api/v1/parcels/:id
 */
const getParcelById = async (req, res, next) => {
  try {
    const parcelId = Number(req.params.id);

    const parcel = await prisma.parcel.findUnique({
      where: { id: parcelId },
      include: {
        parcelOwners: {
          include: {
            owner: true
          }
        },
        acquisitions: {
          include: {
            project: true,
            createdBy: { select: { id: true, name: true, email: true } },
            compensations: true,
            objections: true
          }
        }
      }
    });

    if (!parcel) {
      return sendError(res, 404, `Parcel with ID ${parcelId} not found.`);
    }

    return sendSuccess(res, 200, 'Parcel details retrieved', {
      ...parcel,
      totalValuation: parcel.areaSqm * parcel.marketRatePerSqm
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign or Update Owner Share on a Parcel (Many-to-Many Bridge)
 * POST /api/v1/parcels/:id/owners
 * Access: ADMIN, OFFICER
 */
const assignOwnerShare = async (req, res, next) => {
  try {
    const parcelId = Number(req.params.id);
    const { ownerId, sharePercent } = req.body;

    if (!ownerId || sharePercent === undefined) {
      return sendError(res, 400, 'Please provide ownerId and sharePercent (0.01 - 100.00).');
    }

    const share = parseFloat(sharePercent);
    if (share <= 0 || share > 100) {
      return sendError(res, 400, 'Share percentage must be between 0.01% and 100.00%.');
    }

    // Verify parcel and owner exist
    const [parcel, owner] = await Promise.all([
      prisma.parcel.findUnique({ where: { id: parcelId } }),
      prisma.owner.findUnique({ where: { id: Number(ownerId) } })
    ]);

    if (!parcel) return sendError(res, 404, `Parcel #${parcelId} not found.`);
    if (!owner) return sendError(res, 404, `Landowner #${ownerId} not found.`);

    // Check existing shares to ensure total <= 100%
    const existingShares = await prisma.parcelOwner.findMany({
      where: {
        parcelId,
        NOT: { ownerId: Number(ownerId) }
      }
    });

    const otherSharesTotal = existingShares.reduce((sum, item) => sum + item.sharePercent, 0);
    if (otherSharesTotal + share > 100.001) {
      return sendError(
        res,
        400,
        `Cannot assign ${share}% share. Other co-owners already hold ${otherSharesTotal}%. Total cannot exceed 100%.`
      );
    }

    // Upsert into ParcelOwner junction table
    const assignment = await prisma.parcelOwner.upsert({
      where: {
        parcelId_ownerId: {
          parcelId,
          ownerId: Number(ownerId)
        }
      },
      update: { sharePercent: share },
      create: {
        parcelId,
        ownerId: Number(ownerId),
        sharePercent: share
      },
      include: { owner: true }
    });

    return sendSuccess(res, 200, 'Parcel ownership share assigned/updated', assignment);
  } catch (error) {
    next(error);
  }
};

/**
 * Register a new Citizen Landowner
 * POST /api/v1/parcels/owners/register
 */
const registerOwner = async (req, res, next) => {
  try {
    const { fullName, phone, idNumber } = req.body;

    if (!fullName || !phone || !idNumber) {
      return sendError(res, 400, 'Please provide fullName, phone, and unique idNumber (Aadhaar/PAN).');
    }

    const owner = await prisma.owner.create({
      data: { fullName, phone, idNumber }
    });

    return sendSuccess(res, 201, 'Landowner registered in citizen registry', owner);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all Registered Landowners
 * GET /api/v1/parcels/owners/list
 */
const getOwnersList = async (req, res, next) => {
  try {
    const owners = await prisma.owner.findMany({
      include: {
        parcelOwners: {
          include: { parcel: true }
        },
        _count: {
          select: { parcelOwners: true, compensations: true, objections: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    return sendSuccess(res, 200, 'Registered owners list', owners);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createParcel,
  getParcels,
  getParcelById,
  assignOwnerShare,
  registerOwner,
  getOwnersList
};

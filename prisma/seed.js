// ============================================================================
// 🌱 DATABASE SEED SCRIPT (BEGINNER-FRIENDLY EXPLAINER 🚀)
// File: prisma/seed.js
// ============================================================================
// 💡 WHAT IS DATABASE SEEDING?
// When you create a fresh database, it is completely empty.
// "Seeding" means populating the database with initial realistic sample data
// (like test government officers, farmers, parcels, and highway projects)
// so that our team and professors can test all API endpoints immediately!
// ============================================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma database client
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Land Acquisition database seeding...');

  // --------------------------------------------------------------------------
  // STEP 1: CLEAN EXISTING RECORDS
  // --------------------------------------------------------------------------
  // 💡 WHY REVERSE ORDER?
  // In relational databases, foreign keys prevent you from deleting a parent
  // if children reference it! For example, you cannot delete a User if that User
  // is linked to an Acquisition.
  // Therefore, we delete child tables FIRST, and parent tables LAST:
  await prisma.statusHistory.deleteMany(); // Child of Acquisition & User
  await prisma.objection.deleteMany();     // Child of Acquisition & Owner
  await prisma.compensation.deleteMany();  // Child of Acquisition & Owner
  await prisma.acquisition.deleteMany();   // Child of Parcel, Project & User
  await prisma.parcelOwner.deleteMany();   // Junction between Parcel & Owner
  await prisma.parcel.deleteMany();        // Parent
  await prisma.project.deleteMany();       // Parent
  await prisma.owner.deleteMany();         // Parent
  await prisma.user.deleteMany();          // Parent

  console.log('🧹 Cleaned existing database tables safely in reverse FK order.');

  // --------------------------------------------------------------------------
  // STEP 2: PREPARE SECURE HASHED PASSWORDS
  // --------------------------------------------------------------------------
  // 💡 WHY BCRYPT HASHING? (LECTURE TOPIC: Authentication Security)
  // If an attacker or hacker gets access to the database, they should never see
  // plain-text passwords. "bcrypt" adds random salt and runs 10 computational
  // rounds so "password123" becomes an un-reversible string like:
  // "$2a$10$abcdef123456...".
  const defaultPassword = await bcrypt.hash('password123', 10);

  // --------------------------------------------------------------------------
  // STEP 3: INSERT SYSTEM USERS (ADMIN, OFFICER, CITIZEN)
  // --------------------------------------------------------------------------
  // 💡 LECTURE TOPIC: Role-Based Access Control (RBAC)
  // We create accounts for each role so we can test different authorization levels:

  // Officer account (Can create parcels and manage acquisitions)
  const officerRavi = await prisma.user.create({
    data: {
      name: 'Officer Ravi',
      email: 'ravi@ap.gov.in',
      password: defaultPassword,
      role: 'OFFICER'
    }
  });

  // Administrator account (Has master permissions, can edit budgets and users)
  const adminSharma = await prisma.user.create({
    data: {
      name: 'Admin Sharma',
      email: 'admin@ap.gov.in',
      password: defaultPassword,
      role: 'ADMIN'
    }
  });

  // Citizen Landowner accounts (Can log in to view their compensations and file grievances)
  const userSuresh = await prisma.user.create({
    data: {
      name: 'Suresh Reddy',
      email: 'suresh@gmail.com',
      password: defaultPassword,
      role: 'OWNER'
    }
  });

  const userRamesh = await prisma.user.create({
    data: {
      name: 'Ramesh Reddy',
      email: 'ramesh@gmail.com',
      password: defaultPassword,
      role: 'OWNER'
    }
  });

  const userVenkatesh = await prisma.user.create({
    data: {
      name: 'Venkatesh Rao',
      email: 'venkatesh@gmail.com',
      password: defaultPassword,
      role: 'OWNER'
    }
  });

  console.log('👤 Created users: Admin Sharma, Officer Ravi, Suresh, Ramesh, Venkatesh');

  // --------------------------------------------------------------------------
  // STEP 4: REGISTER CITIZEN LANDOWNERS IN CADASTRAL REGISTRY
  // --------------------------------------------------------------------------
  // 💡 WHY A SEPARATE 'OWNER' TABLE? (LECTURE TOPIC: Normalization)
  // Legal land ownership requires verified National ID (Aadhaar/PAN) and phone number.
  // We link each Owner to their User login account using `userId`.
  const ownerSuresh = await prisma.owner.create({
    data: {
      fullName: 'Suresh Reddy',
      phone: '9848011111',
      idNumber: 'ID-901',
      userId: userSuresh.id
    }
  });

  const ownerRamesh = await prisma.owner.create({
    data: {
      fullName: 'Ramesh Reddy',
      phone: '9848022222',
      idNumber: 'ID-902',
      userId: userRamesh.id
    }
  });

  const ownerVenkatesh = await prisma.owner.create({
    data: {
      fullName: 'Venkatesh Rao',
      phone: '9848033333',
      idNumber: 'ID-903',
      userId: userVenkatesh.id
    }
  });

  console.log('📜 Registered owners in cadastral registry');

  // --------------------------------------------------------------------------
  // STEP 5: INSERT LAND PARCELS
  // --------------------------------------------------------------------------
  // Parcel 1: Nandyal (10,000 sqm @ ₹500/sqm = ₹50,00,000 Total Valuation)
  const parcel1 = await prisma.parcel.create({
    data: {
      surveyNumber: 'P-101',
      village: 'Nandyal',
      areaSqm: 10000.0,
      marketRatePerSqm: 500.0
    }
  });

  // Parcel 2: Allagadda (4,000 sqm @ ₹1,200/sqm = ₹48,00,000 Total Valuation)
  const parcel2 = await prisma.parcel.create({
    data: {
      surveyNumber: 'P-102',
      village: 'Allagadda',
      areaSqm: 4000.0,
      marketRatePerSqm: 1200.0
    }
  });

  console.log('🏞️ Created parcels: P-101 (Nandyal), P-102 (Allagadda)');

  // --------------------------------------------------------------------------
  // STEP 6: ASSIGN PARCEL OWNERSHIP SHARES (MANY-TO-MANY BRIDGE)
  // --------------------------------------------------------------------------
  // 💡 LECTURE TOPIC: Many-to-Many Relations
  // - Parcel P-101 is co-owned: Suresh (60%) + Ramesh (40%) = 100%
  // - Parcel P-102 is sole-owned: Venkatesh (100%)
  await prisma.parcelOwner.create({
    data: {
      parcelId: parcel1.id,
      ownerId: ownerSuresh.id,
      sharePercent: 60.0
    }
  });

  await prisma.parcelOwner.create({
    data: {
      parcelId: parcel1.id,
      ownerId: ownerRamesh.id,
      sharePercent: 40.0
    }
  });

  await prisma.parcelOwner.create({
    data: {
      parcelId: parcel2.id,
      ownerId: ownerVenkatesh.id,
      sharePercent: 100.0
    }
  });

  console.log('🤝 Assigned parcel ownership percentages (Co-ownership)');

  // --------------------------------------------------------------------------
  // STEP 7: INSERT GOVERNMENT INFRASTRUCTURE PROJECT
  // --------------------------------------------------------------------------
  const projectHighway = await prisma.project.create({
    data: {
      name: 'Highway NH-167',
      department: 'NHAI',
      budget: 50000000.0 // ₹5 Crore
    }
  });

  console.log('🏗️ Created project: Highway NH-167 (NHAI)');

  // --------------------------------------------------------------------------
  // STEP 8: INITIATE LAND ACQUISITION WORKFLOW
  // --------------------------------------------------------------------------
  // 💡 LECTURE TOPIC: State Machine Workflow Engine
  // We earmark Parcel P-101 for Highway NH-167. Current stage: VALUATED
  const acq1 = await prisma.acquisition.create({
    data: {
      parcelId: parcel1.id,
      projectId: projectHighway.id,
      status: 'VALUATED',
      createdById: officerRavi.id
    }
  });

  console.log(`📋 Created acquisition #${acq1.id} for Parcel P-101`);

  // --------------------------------------------------------------------------
  // STEP 9: GENERATE LANDOWNER COMPENSATIONS
  // --------------------------------------------------------------------------
  // 💡 MATHEMATICAL FORMULA:
  // Parcel Valuation = 10,000 sqm * ₹500 = ₹50,00,000 (Fifty Lakhs)
  // - Suresh Reddy (60%): ₹30,00,000 -> Status: PENDING
  // - Ramesh Reddy (40%): ₹20,00,000 -> Status: PAID
  await prisma.compensation.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerSuresh.id,
      amount: 3000000.0,
      paymentStatus: 'PENDING'
    }
  });

  await prisma.compensation.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerRamesh.id,
      amount: 2000000.0,
      paymentStatus: 'PAID',
      paymentDate: new Date()
    }
  });

  console.log('💰 Seeded compensations: Suresh (Pending), Ramesh (Paid)');

  // --------------------------------------------------------------------------
  // STEP 10: CITIZEN GRIEVANCE / OBJECTION
  // --------------------------------------------------------------------------
  // Suresh Reddy raises an objection citing that market rates have gone up
  await prisma.objection.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerSuresh.id,
      reason: 'Compensation rate too low compared to market value',
      status: 'OPEN'
    }
  });

  console.log('⚠️ Filed initial objection from Suresh Reddy (OPEN)');

  // --------------------------------------------------------------------------
  // STEP 11: IMMUTABLE AUDIT TRAIL (STATUS HISTORY)
  // --------------------------------------------------------------------------
  // Audit log showing how acquisition progressed: PROPOSED -> NOTIFIED -> VALUATED
  await prisma.statusHistory.create({
    data: {
      acquisitionId: acq1.id,
      oldStatus: 'PROPOSED',
      newStatus: 'NOTIFIED',
      changedById: officerRavi.id
    }
  });

  await prisma.statusHistory.create({
    data: {
      acquisitionId: acq1.id,
      oldStatus: 'NOTIFIED',
      newStatus: 'VALUATED',
      changedById: officerRavi.id
    }
  });

  console.log('📜 Seeded audit trail status history');
  console.log('✅ Database seeding complete! Ready for testing.');
}

// Execute the main function and handle errors
main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Always disconnect Prisma client when script finishes to free connection pool
    await prisma.$disconnect();
  });

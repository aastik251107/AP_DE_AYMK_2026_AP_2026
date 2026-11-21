// Inserts demo users and land acquisition records.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// Initialize Prisma database client
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Land Acquisition database seeding...');

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

  const defaultPassword = await bcrypt.hash('password123', 10);

  const adminSharma = await prisma.user.create({
    data: {
      name: 'Admin Sharma',
      email: 'admin@ap.gov.in',
      password: defaultPassword,
      role: 'ADMIN'
    }
  });

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

  console.log('👤 Created users: Admin Sharma, Suresh, Ramesh, Venkatesh');

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

  const parcel1 = await prisma.parcel.create({
    data: {
      surveyNumber: 'P-101',
      village: 'Nandyal',
      areaSqm: 10000.0,
      marketRatePerSqm: 500.0
    }
  });

  const parcel2 = await prisma.parcel.create({
    data: {
      surveyNumber: 'P-102',
      village: 'Allagadda',
      areaSqm: 4000.0,
      marketRatePerSqm: 1200.0
    }
  });

  console.log('🏞️ Created parcels: P-101 (Nandyal), P-102 (Allagadda)');

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

  const projectHighway = await prisma.project.create({
    data: {
      name: 'Highway NH-167',
      department: 'NHAI',
      budget: 50000000.0 // ₹5 Crore
    }
  });

  console.log('🏗️ Created project: Highway NH-167 (NHAI)');

  const acq1 = await prisma.acquisition.create({
    data: {
      parcelId: parcel1.id,
      projectId: projectHighway.id,
      status: 'VALUATED',
      createdById: adminSharma.id
    }
  });

  console.log(`📋 Created acquisition #${acq1.id} for Parcel P-101`);

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

  await prisma.objection.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerSuresh.id,
      reason: 'Compensation rate too low compared to market value',
      status: 'OPEN'
    }
  });

  console.log('⚠️ Filed initial objection from Suresh Reddy (OPEN)');

  await prisma.statusHistory.create({
    data: {
      acquisitionId: acq1.id,
      oldStatus: 'PROPOSED',
      newStatus: 'NOTIFIED',
      changedById: adminSharma.id
    }
  });

  await prisma.statusHistory.create({
    data: {
      acquisitionId: acq1.id,
      oldStatus: 'NOTIFIED',
      newStatus: 'VALUATED',
      changedById: adminSharma.id
    }
  });

  console.log('📜 Seeded audit trail status history');
  console.log('✅ Database seeding complete! Ready for testing.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

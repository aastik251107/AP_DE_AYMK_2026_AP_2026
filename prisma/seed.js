const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Land Acquisition database seeding...');

  // 1. Clean existing records (reverse dependency order)
  await prisma.statusHistory.deleteMany();
  await prisma.objection.deleteMany();
  await prisma.compensation.deleteMany();
  await prisma.acquisition.deleteMany();
  await prisma.parcelOwner.deleteMany();
  await prisma.parcel.deleteMany();
  await prisma.project.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // Common password hash for test users
  const defaultPassword = await bcrypt.hash('password123', 10);

  // 2. Insert Users (Admin, Officer, and Citizen Owners)
  const officerRavi = await prisma.user.create({
    data: {
      name: 'Officer Ravi',
      email: 'ravi@ap.gov.in',
      password: defaultPassword,
      role: 'OFFICER'
    }
  });

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

  console.log('👤 Created users: Admin Sharma, Officer Ravi, Suresh, Ramesh, Venkatesh');

  // 3. Insert Landowners
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

  // 4. Insert Land Parcels
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

  // 5. Assign Parcel Ownership Shares
  // P-101: Suresh (60%), Ramesh (40%)
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

  // P-102: Venkatesh (100%)
  await prisma.parcelOwner.create({
    data: {
      parcelId: parcel2.id,
      ownerId: ownerVenkatesh.id,
      sharePercent: 100.0
    }
  });

  console.log('🤝 Assigned parcel ownership percentages');

  // 6. Insert Infrastructure Project
  const projectHighway = await prisma.project.create({
    data: {
      name: 'Highway NH-167',
      department: 'NHAI',
      budget: 50000000.0
    }
  });

  console.log('🏗️ Created project: Highway NH-167 (NHAI)');

  // 7. Initiate Acquisition for Parcel P-101
  const acq1 = await prisma.acquisition.create({
    data: {
      parcelId: parcel1.id,
      projectId: projectHighway.id,
      status: 'VALUATED',
      createdById: officerRavi.id
    }
  });

  console.log(`📋 Created acquisition #${acq1.id} for Parcel P-101`);

  // 8. Compensations for Acquisition
  // Suresh: 10,000 sqm * 500 * 60% = 3,000,000
  await prisma.compensation.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerSuresh.id,
      amount: 3000000.0,
      paymentStatus: 'PENDING'
    }
  });

  // Ramesh: 10,000 sqm * 500 * 40% = 2,000,000
  await prisma.compensation.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerRamesh.id,
      amount: 2000000.0,
      paymentStatus: 'PAID',
      paymentDate: new Date()
    }
  });

  console.log('💰 Seeded compensations for Suresh and Ramesh');

  // 9. Landowner Objection
  await prisma.objection.create({
    data: {
      acquisitionId: acq1.id,
      ownerId: ownerSuresh.id,
      reason: 'Compensation rate too low compared to market value',
      status: 'OPEN'
    }
  });

  console.log('⚠️ Filed initial objection from Suresh Reddy');

  // 10. Audit History
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
  console.log('✅ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

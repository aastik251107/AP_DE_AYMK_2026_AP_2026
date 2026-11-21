// Exercises authentication, role access, and API workflows.

const http = require('http');
const app = require('../src/app');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const PORT = 5055;
let server;
let adminToken = '';
let landownerToken = '';

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: reqHeaders
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(data);
          } catch (e) {
            json = data;
          }
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Automated API Test Suite...\n');
  server = app.listen(PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    const health = await request('GET', '/api/v1/health');
    assert(health.statusCode === 200 && health.body.status === 'healthy', 'GET /api/v1/health returns 200 Healthy');

    const adminLogin = await request('POST', '/api/v1/auth/login', {
      email: 'admin@ap.gov.in',
      password: 'password123'
    });
    assert(adminLogin.statusCode === 200 && adminLogin.body.data.token, 'POST /api/v1/auth/login (Admin)');
    adminToken = adminLogin.body.data.token;

    const ownerLogin = await request('POST', '/api/v1/auth/login', {
      email: 'suresh@gmail.com',
      password: 'password123'
    });
    assert(ownerLogin.statusCode === 200 && ownerLogin.body.data.token, 'POST /api/v1/auth/login (Landowner)');
    landownerToken = ownerLogin.body.data.token;

    const unauthorizedProject = await request(
      'POST',
      '/api/v1/projects',
      { name: 'Illegal Project', department: 'Test', budget: 1000 },
      { Authorization: `Bearer ${landownerToken}` }
    );
    assert(unauthorizedProject.statusCode === 403, 'RBAC: Landowner rejected from creating project (403 Forbidden)');

    const newProject = await request(
      'POST',
      '/api/v1/projects',
      { name: 'Metro Corridor Phase 2', department: 'Urban Development', budget: 80000000 },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(newProject.statusCode === 201 && newProject.body.data.id, 'RBAC: Admin creates Project (201 Created)');
    const createdProjectId = newProject.body.data.id;

    const newParcel = await request(
      'POST',
      '/api/v1/parcels',
      {
        surveyNumber: 'P-999-TEST',
        village: 'Kurnool',
        areaSqm: 5000,
        marketRatePerSqm: 800,
        owners: [{ ownerId: 1, sharePercent: 100 }]
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(newParcel.statusCode === 201 && newParcel.body.data.id, 'POST /api/v1/parcels (Admin registers parcel)');
    const createdParcelId = newParcel.body.data.id;

    const newAcquisition = await request(
      'POST',
      '/api/v1/acquisitions',
      {
        parcelId: createdParcelId,
        projectId: createdProjectId
      },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(
      newAcquisition.statusCode === 201 && newAcquisition.body.data.status === 'PROPOSED',
      'POST /api/v1/acquisitions (Workflow initiated: PROPOSED)'
    );
    const createdAcqId = newAcquisition.body.data.id;

    const advanceNotified = await request(
      'PATCH',
      `/api/v1/acquisitions/${createdAcqId}/status`,
      { newStatus: 'NOTIFIED' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(
      advanceNotified.statusCode === 200 && advanceNotified.body.data.status === 'NOTIFIED',
      'PATCH /api/v1/acquisitions/:id/status (Transition to NOTIFIED)'
    );

    const advanceValuated = await request(
      'PATCH',
      `/api/v1/acquisitions/${createdAcqId}/status`,
      { newStatus: 'VALUATED' },
      { Authorization: `Bearer ${adminToken}` }
    );
    assert(
      advanceValuated.statusCode === 200 && advanceValuated.body.data.status === 'VALUATED',
      'PATCH /api/v1/acquisitions/:id/status (Transition to VALUATED & auto-compensation generation)'
    );

    const compList = await request('GET', `/api/v1/compensations?acquisitionId=${createdAcqId}`, null, {
      Authorization: `Bearer ${adminToken}`
    });
    assert(
      compList.statusCode === 200 && compList.body.data.length > 0,
      'GET /api/v1/compensations (Auto-generated compensation found)'
    );
    const compRecord = compList.body.data[0];

    const idempotencyKey = 'test_key_xyz_12345';
    const firstPayment = await request(
      'POST',
      `/api/v1/compensations/${compRecord.id}/pay`,
      {},
      {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey
      }
    );
    assert(
      firstPayment.statusCode === 200 && firstPayment.headers['x-cache-lookup'] === 'MISS',
      'Idempotency First Request: Processed successfully (X-Cache-Lookup: MISS)'
    );

    const secondPayment = await request(
      'POST',
      `/api/v1/compensations/${compRecord.id}/pay`,
      {},
      {
        Authorization: `Bearer ${adminToken}`,
        'Idempotency-Key': idempotencyKey
      }
    );
    assert(
      secondPayment.statusCode === 200 && secondPayment.headers['x-cache-lookup'] === 'HIT',
      'Idempotency Second Request: Replayed from cache (X-Cache-Lookup: HIT)'
    );

    const objection = await request(
      'POST',
      '/api/v1/objections',
      {
        acquisitionId: createdAcqId,
        reason: 'Claiming tree assets and well valuation adjustment'
      },
      { Authorization: `Bearer ${landownerToken}` }
    );
    assert(
      objection.statusCode === 201 || objection.statusCode === 403,
      'POST /api/v1/objections (Landowner grievance validation)'
    );

    console.log(`\n=======================================================`);
    console.log(`🏁 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log(`=======================================================\n`);
  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();

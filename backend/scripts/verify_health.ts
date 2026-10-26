import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

async function checkHealth() {
  console.log('=== CHECKING BACKEND HEALTH ENDPOINT ===');
  try {
    const res = await request(app).get('/api/health');
    console.log(`HTTP Status: ${res.status}`);
    console.log('Response Body:', JSON.stringify(res.body, null, 2));

    if (res.status === 200 && res.body.data?.status === 'UP' && res.body.data?.database === 'connected') {
      console.log('\n✅ HEALTH CHECK PASS: Backend is UP and Database is CONNECTED!');
      process.exit(0);
    } else {
      console.error('\n❌ HEALTH CHECK FAILED or Database not connected:', res.body);
      process.exit(1);
    }
  } catch (err: any) {
    console.error('Health check exception:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkHealth();

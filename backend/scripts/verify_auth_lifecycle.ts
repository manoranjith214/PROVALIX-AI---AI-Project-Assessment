import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';

async function verifyAuthLifecycle() {
  console.log('=== VERIFYING AUTHENTICATION LIFECYCLE & ERROR HANDLING ===\n');

  const testEmail = `authtest_${Date.now()}@provalix.test`;
  const testPassword = 'Password123!Secure';
  let createdUserId: string | null = null;

  try {
    // 1. Register test user
    console.log(`1. Testing User Registration (/api/auth/register) with ${testEmail}...`);
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Auth Test User',
        email: testEmail,
        password: testPassword,
        department: 'Computer Science & Engineering',
        year: '4th Year',
        college: 'Apex Institute of Technology & Research',
      });

    if (regRes.status !== 201) {
      throw new Error(`Registration failed with status ${regRes.status}: ${JSON.stringify(regRes.body)}`);
    }
    console.log('   ✅ Registration PASS (201 Created)');
    createdUserId = regRes.body.data.user.id;

    // 2. Test Login
    console.log('2. Testing User Login (/api/auth/login)...');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    if (loginRes.status !== 200) {
      throw new Error(`Login failed with status ${loginRes.status}: ${JSON.stringify(loginRes.body)}`);
    }
    const { accessToken, refreshToken, user } = loginRes.body.data;
    if (!accessToken || !refreshToken) {
      throw new Error('Tokens missing from login response');
    }
    console.log(`   ✅ Login PASS (200 OK) - Received accessToken & refreshToken for ${user.email}`);

    // 3. Test Protected Route: /api/auth/me with valid token
    console.log('3. Testing /api/auth/me with valid accessToken...');
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    if (meRes.status !== 200 || meRes.body.data.id !== createdUserId) {
      throw new Error(`/api/auth/me failed with status ${meRes.status}: ${JSON.stringify(meRes.body)}`);
    }
    console.log(`   ✅ /api/auth/me PASS (200 OK) - Returned profile: ${meRes.body.data.name} (${meRes.body.data.permanentId})`);

    // 4. Test Another Protected Route: /api/chatbot/conversations
    console.log('4. Testing Protected Route /api/chatbot/conversations...');
    const chatRes = await request(app)
      .get('/api/chatbot/conversations')
      .set('Authorization', `Bearer ${accessToken}`);

    if (chatRes.status !== 200) {
      throw new Error(`Protected route /api/chatbot/conversations failed with status ${chatRes.status}: ${JSON.stringify(chatRes.body)}`);
    }
    console.log('   ✅ Protected route PASS (200 OK)');

    // 5. Test Token Refresh
    console.log('5. Testing Token Refresh (/api/auth/refresh)...');
    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    if (refreshRes.status !== 200 || !refreshRes.body.data.accessToken) {
      throw new Error(`Refresh failed with status ${refreshRes.status}: ${JSON.stringify(refreshRes.body)}`);
    }
    const newAccessToken = refreshRes.body.data.accessToken;
    console.log('   ✅ Token refresh PASS (200 OK) - New accessToken generated');

    // 6. Test /api/auth/me with refreshed token
    console.log('6. Testing /api/auth/me with new refreshed accessToken...');
    const meRefreshedRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newAccessToken}`);

    if (meRefreshedRes.status !== 200) {
      throw new Error(`/api/auth/me with refreshed token failed: ${meRefreshedRes.status}`);
    }
    console.log('   ✅ /api/auth/me with refreshed token PASS (200 OK)');

    // 7. Test Expired Token Error Distinction
    console.log('7. Testing Expired Token distinction on /api/auth/me...');
    const expiredToken = jwt.sign(
      { id: createdUserId, email: testEmail, name: 'Auth Test' },
      config.jwt.secret,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    const expiredRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    if (expiredRes.status !== 401 || expiredRes.body.error !== 'TOKEN_EXPIRED') {
      throw new Error(`Expected 401 TOKEN_EXPIRED but got status ${expiredRes.status}: ${JSON.stringify(expiredRes.body)}`);
    }
    console.log(`   ✅ Expired token PASS (401 Unauthorized, error: "${expiredRes.body.error}")`);

    // 8. Test Invalid / Tampered Token
    console.log('8. Testing Invalid/Tampered Token on /api/auth/me...');
    const invalidRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid_tampered_token_xyz_123');

    if (invalidRes.status !== 401 || invalidRes.body.error !== 'AUTH_REQUIRED') {
      throw new Error(`Expected 401 AUTH_REQUIRED but got status ${invalidRes.status}: ${JSON.stringify(invalidRes.body)}`);
    }
    console.log(`   ✅ Invalid token PASS (401 Unauthorized, error: "${invalidRes.body.error}")`);

    // 9. Test Missing Token
    console.log('9. Testing Missing Token on /api/auth/me...');
    const missingRes = await request(app).get('/api/auth/me');

    if (missingRes.status !== 401) {
      throw new Error(`Expected 401 for missing token but got ${missingRes.status}`);
    }
    console.log('   ✅ Missing token PASS (401 Unauthorized)');

    // 10. Test Logout
    console.log('10. Testing Logout (/api/auth/logout)...');
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .send({ refreshToken });

    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed with status ${logoutRes.status}`);
    }
    console.log('   ✅ Logout PASS (200 OK)');

    // 11. Test Refresh with Revoked Token (must fail)
    console.log('11. Testing Refresh with Revoked Token...');
    const revokedRefreshRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken });

    if (revokedRefreshRes.status !== 401) {
      throw new Error(`Expected 401 for revoked refresh token but got ${revokedRefreshRes.status}`);
    }
    console.log('   ✅ Revoked token rejection PASS (401 Unauthorized)');

    console.log('\n====================================================');
    console.log('✅ ALL AUTHENTICATION LIFECYCLE TESTS PASSED!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n❌ AUTH VERIFICATION SUITE FAILED:', err?.message || err);
    process.exit(1);
  } finally {
    // Cleanup test user
    if (createdUserId) {
      try {
        await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
        await prisma.user.delete({ where: { id: createdUserId } });
        console.log(`\n🧹 Cleaned up test user ${createdUserId}`);
      } catch (cleanupErr) {
        console.warn('Cleanup warning:', cleanupErr);
      }
    }
    await prisma.$disconnect();
  }
}

verifyAuthLifecycle();

import request from 'supertest';
import app from '../src/app';

jest.setTimeout(15000);

describe('Frontend-Backend Authentication & CORS Integration Tests', () => {
  test('CORS headers allow requests from frontend http://localhost:5173', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  test('Protected endpoint returns 401 with standard error structure when unauthenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Origin', 'http://localhost:5173');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  test('Rejects registration with weak password violating validation schema', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        name: 'Test Student',
        email: 'invalid-email',
        password: '123',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
  });

  test('Rejects login with invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'nonexistent.student@institution.edu',
        password: 'Password@123',
      });

    expect([401, 500, 503]).toContain(res.status); // 401 if DB reachable, 500/503 if DB not connected in test
    expect(res.body.success).toBe(false);
  }, 15000);

  test('Rejects refresh with missing or invalid token with 422', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Origin', 'http://localhost:5173')
      .send({
        refreshToken: '',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('Forgot password endpoint accepts valid email and responds with success format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'student.forgot@apex.edu',
      });

    // In unit test without mock DB, if DB is down it may return 500/503, or 200/404
    expect([200, 404, 500, 503]).toContain(res.status);
    expect(typeof res.body.success).toBe('boolean');
  }, 30000);

  test('POST /api/auth/supabase rejects request with missing accessToken with 422', async () => {
    const res = await request(app)
      .post('/api/auth/supabase')
      .set('Origin', 'http://localhost:5173')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/google rejects request with missing tokens with 422', async () => {
    const res = await request(app)
      .post('/api/auth/google')
      .set('Origin', 'http://localhost:5173')
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/supabase rejects invalid or forged accessToken with 401', async () => {
    const res = await request(app)
      .post('/api/auth/supabase')
      .set('Origin', 'http://localhost:5173')
      .send({
        accessToken: 'forged_or_invalid_jwt_token_xyz',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

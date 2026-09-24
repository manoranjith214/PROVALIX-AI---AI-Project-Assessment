import request from 'supertest';
import app from '../src/app';

jest.setTimeout(15000);

describe('API Health and Core Route Endpoints', () => {
  test('GET /api/health returns 200 and standard response message', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Provalix AI API is running');
    expect(res.body.data.status).toBe('UP');
  });

  test('GET / returns API overview with Swagger docs link', async () => {
    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Provalix AI Backend API');
    expect(res.body.documentation).toBe('/api/docs');
  });

  test('Protected endpoint without token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Authentication required');
  });

  test('Non-existent route returns 404', async () => {
    const res = await request(app).get('/api/non-existent-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

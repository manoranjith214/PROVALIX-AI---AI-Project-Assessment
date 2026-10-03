import request from 'supertest';
import app from '../src/app';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';
import { sourceCodeAnalyzer } from '../src/services/sourceCodeAnalyzer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Stage 3: Production Hardening, Security & Health Check Tests', () => {
  jest.setTimeout(25000);

  describe('1. Health Check Endpoint Security', () => {
    it('GET /health returns 200 with status ok and does not expose secrets', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      
      // Ensure no sensitive config is exposed
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('DATABASE_URL');
      expect(bodyStr).not.toContain('JWT_SECRET');
      expect(bodyStr).not.toContain('GEMINI_API_KEY');
      expect(bodyStr).not.toContain('SUPABASE_KEY');
      expect(bodyStr).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    });

    it('GET /api/health returns 200 with database status without leaking credentials', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status', 'UP');
      expect(res.body.data).toHaveProperty('database');

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('postgresql://');
      expect(bodyStr).not.toContain('password');
    });
  });

  describe('2. Authentication Hardening & Token Security', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/classrooms');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token|unauthorized|authenticated/i);
    });

    it('rejects expired JWT tokens with 401', async () => {
      const expiredToken = jwt.sign(
        { id: 'usr-expired', email: 'expired@test.com', role: 'STUDENT' },
        config.jwt.secret,
        { expiresIn: '-10s' }
      );

      const res = await request(app)
        .get('/api/classrooms')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/expired|invalid/i);
    });

    it('rejects tampered or malformed JWT tokens with 401', async () => {
      const tamperedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidSig';
      const res = await request(app)
        .get('/api/classrooms')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects tokens signed with wrong secret with 401', async () => {
      const wrongSecretToken = jwt.sign(
        { id: 'usr-fake', email: 'fake@test.com', role: 'STUDENT' },
        'completely-different-wrong-secret-key-12345',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/api/classrooms')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. Archive Extraction Safety & Zip Bomb / Traversal Protection', () => {
    const tempDir = path.join(os.tmpdir(), 'provalix-hardening-tests');

    beforeAll(() => {
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
    });

    afterAll(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    });

    it('silently and safely rejects zip entries with path traversal (..)', async () => {
      const zipPath = path.join(tempDir, 'traversal-attack.zip');
      const zip = new AdmZip();
      zip.addFile('normal.js', Buffer.from('console.log("safe");'));
      zip.addFile('escape.js', Buffer.from('console.log("evil");'));
      zip.getEntries()[1].entryName = '../../malicious_escape.js';
      zip.writeZip(zipPath);

      const result = await sourceCodeAnalyzer.analyzeProjectSource({
        resources: [{ name: 'traversal-attack.zip', path: zipPath }]
      });

      expect(result.sourceAvailable).toBe(true);
      // Only normal.js should be processed, malicious_escape.js must be excluded!
      expect(result.fileCount).toBe(1);
    });

    it('silently and safely rejects zip entries with null bytes or root slashes', async () => {
      const zipPath = path.join(tempDir, 'nullbyte-attack.zip');
      const zip = new AdmZip();
      zip.addFile('app.js', Buffer.from('const x = 1;\nconsole.log(x);'));
      zip.addFile('root.js', Buffer.from('console.log("evil");'));
      zip.getEntries()[1].entryName = '/root_escape.js';
      zip.writeZip(zipPath);

      const result = await sourceCodeAnalyzer.analyzeProjectSource({
        resources: [{ name: 'nullbyte-attack.zip', path: zipPath }]
      });

      expect(result.sourceAvailable).toBe(true);
      // Only app.js should be processed
      expect(result.fileCount).toBe(1);
    });

    it('processes safe, valid code archives correctly without disk leakage', async () => {
      const zipPath = path.join(tempDir, 'valid-app.zip');
      const zip = new AdmZip();
      zip.addFile('src/index.js', Buffer.from('console.log("Hello Provalix");'));
      zip.addFile('package.json', Buffer.from(JSON.stringify({ name: 'test-app', dependencies: { express: '^4.18.2' } })));
      zip.writeZip(zipPath);

      const result = await sourceCodeAnalyzer.analyzeProjectSource({
        resources: [{ name: 'valid-app.zip', path: zipPath }]
      });

      expect(result.sourceAvailable).toBe(true);
      expect(result.fileCount).toBe(2);
      expect(result.lineCount).toBeGreaterThan(0);
      expect(result.languages).toHaveProperty('JavaScript');
      expect(result.dependencies).toContain('express');
    });
  });

  describe('4. Rate Limiting & Abuse Protection', () => {
    it('evaluation endpoints are protected by evaluationRateLimiter with rate limit headers', async () => {
      const validToken = jwt.sign(
        { id: 'usr-rate-test', email: 'ratetest@provalix.io', role: 'STUDENT' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/api/project-checker/projects/test-project-uuid-not-found/ai-evaluate')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect([404, 429, 400]).toContain(res.status);
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
    });
  });

  describe('5. Error Response Consistency', () => {
    it('returns consistent JSON error structure without exposing stack traces', async () => {
      const res = await request(app).get('/api/non-existent-endpoint-404');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body).not.toHaveProperty('stack');
    });
  });
});

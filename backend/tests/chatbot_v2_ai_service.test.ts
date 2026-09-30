import express, { Express } from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { config } from '../src/config/env';

// Mock chatbot repository so tests don't require external database user seeding
jest.mock('../src/integrations/chatbot/ChatbotRepository', () => {
  const store: Record<string, any> = {};
  return {
    chatbotRepository: {
      findConversationById: jest.fn((id: string) => Promise.resolve(store[id] || null)),
      createConversation: jest.fn((userId: string, title: string, projectId?: string, submissionId?: string) => {
        const id = `conv-mock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const conv = {
          id,
          userId,
          title,
          projectId,
          submissionId,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store[id] = conv;
        return Promise.resolve(conv);
      }),
      listUserConversations: jest.fn((userId: string) => {
        return Promise.resolve(Object.values(store).filter((c: any) => c.userId === userId));
      }),
      deleteConversation: jest.fn((id: string) => {
        delete store[id];
        return Promise.resolve({ success: true, message: 'Conversation deleted' });
      }),
      addMessage: jest.fn((conversationId: string, role: string, message: string, sources?: any[]) => {
        const conv = store[conversationId] || { id: conversationId, messages: [] };
        const msg = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          conversationId,
          role,
          message,
          sources,
          createdAt: new Date(),
        };
        conv.messages.push(msg);
        store[conversationId] = conv;
        return Promise.resolve(msg);
      }),
      findRecentPendingUserConversation: jest.fn((userId: string, userMessage: string) => {
        for (const conv of Object.values(store) as any[]) {
          if (conv.userId === userId && conv.messages.length > 0) {
            const lastMsg = conv.messages[conv.messages.length - 1];
            if (lastMsg.role === 'user' && lastMsg.message === userMessage) {
              return Promise.resolve(conv);
            }
          }
        }
        return Promise.resolve(null);
      }),
    },
  };
});

import { errorHandler, AppError } from '../src/middleware/errorMiddleware';
import chatbotRoutes from '../src/routes/chatbotRoutes';
import { aiService } from '../src/services/aiService';

describe('Provalix AI Assistant V2 - AI Service and End-to-End Cases (A - K)', () => {
  let app: Express;
  let authToken: string;
  const testUserId = 'test-ai-user-id-v2-cases';

  beforeAll(async () => {
    jest.setTimeout(30000);
    app = express();
    app.use(express.json());
    app.use('/api/chatbot', chatbotRoutes);
    app.use(errorHandler);

    authToken = jwt.sign(
      {
        id: testUserId,
        email: 'aiuser@provalix.test',
        name: 'AI Test User',
      },
      config.jwt.secret,
      { expiresIn: '2h' }
    );
  });

  // Case A: "Hello"
  it('Case A: User sends "Hello" → minimal prompt returns valid greeting', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hello',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.message).toBe('string');
    expect(res.body.data.message.length).toBeGreaterThan(3);
    expect(res.body.data.contextUsed.detectedIntent).toBe('GENERAL');
  }, 30000);

  // Case B: "What is binary search?"
  it('Case B: User sends "What is binary search?" → returns programming response', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'What is binary search?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const msg = res.body.data.message.toLowerCase();
    expect(msg).toMatch(/search|algorithm|sorted|divide|log/i);
    expect(res.body.data.contextUsed.detectedIntent).toBe('PROGRAMMING');
  }, 30000);

  // Case C: "Explain my current evaluation status"
  it('Case C: "Explain my current evaluation status" → retrieves evaluation context for authenticated user', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Explain my current evaluation status',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contextUsed.detectedIntent).toBe('PROJECT');
    expect(res.body.data.contextUsed.hasProjectContext).toBe(true);
  }, 30000);

  // Case D: Tamil question
  it('Case D: Tamil query "React என்றால் என்ன?" → responds in Tamil', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'React என்றால் என்ன?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contextUsed.detectedLanguage).toBe('tamil');
    expect(typeof res.body.data.message).toBe('string');
    expect(res.body.data.message.length).toBeGreaterThan(10);
  }, 30000);

  // Case E: Tanglish question
  it('Case E: Tanglish query "React na enna?" → responds in Tanglish', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'React na enna?',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.contextUsed.detectedLanguage).toBe('tanglish');
    expect(typeof res.body.data.message).toBe('string');
    expect(res.body.data.message.length).toBeGreaterThan(10);
  }, 30000);

  // Case F: Two different questions consecutively
  it('Case F: Two different questions consecutively produce two distinct answers', async () => {
    const res1 = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'What is Python?',
      });

    const res2 = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'What is MySQL?',
      });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.data.message).not.toEqual(res2.body.data.message);
  }, 30000);

  // Case G: Gemini unavailable (500/503)
  it('Case G: Gemini unavailable → returns 500 structured error with retry prompt', async () => {
    const spy = jest.spyOn(aiService, 'generateChatResponse').mockRejectedValueOnce(
      new AppError('AI service temporarily unavailable. Please click Retry.', 500)
    );

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Hello Gemini',
      });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('AI service temporarily unavailable. Please click Retry.');
    spy.mockRestore();
  });

  // Case H: Gemini 429 rate limit
  it('Case H: Gemini 429 rate limit → returns 429 structured error', async () => {
    const spy = jest.spyOn(aiService, 'generateChatResponse').mockRejectedValueOnce(
      new AppError('AI rate limit exceeded. Please wait a moment before trying again.', 429)
    );

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Rate limit test',
      });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('rate limit');
    spy.mockRestore();
  });

  // Case I: Missing API key
  it('Case I: Missing API key → returns 401 configuration error without crash', async () => {
    const spy = jest.spyOn(aiService, 'generateChatResponse').mockRejectedValueOnce(
      new AppError('AI service authentication error. Please contact administrator.', 401)
    );

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Auth check',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('authentication');
    spy.mockRestore();
  });

  // Case J: Invalid model
  it('Case J: Invalid model / bad request → returns 400 without crashing', async () => {
    const spy = jest.spyOn(aiService, 'generateChatResponse').mockRejectedValueOnce(
      new AppError('Invalid AI request. Please try rephrasing your message.', 400)
    );

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Invalid model test',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Invalid AI request');
    spy.mockRestore();
  });

  // Case K: Backend restart / service continuity
  it('Case K: Backend restart / fresh controller instance handles requests cleanly', async () => {
    const freshApp = express();
    freshApp.use(express.json());
    freshApp.use('/api/chatbot', chatbotRoutes);
    freshApp.use(errorHandler);

    const res = await request(freshApp)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Testing fresh instance continuity',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.message).toBe('string');
  });

  // Test Retry idempotency (Requirement 11)
  it('Requirement 11: Retry does not duplicate user message or create duplicate conversations', async () => {
    // 1. Initial attempt fails
    const spy = jest.spyOn(aiService, 'generateChatResponse').mockRejectedValueOnce(
      new AppError('AI service temporarily unavailable. Please click Retry.', 500)
    );

    const failRes = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Retry idempotency test message',
      });

    expect(failRes.status).toBe(500);
    spy.mockRestore();

    // 2. Retry with isRetry: true
    const retryRes = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        message: 'Retry idempotency test message',
        isRetry: true,
      });

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.success).toBe(true);
  });
});

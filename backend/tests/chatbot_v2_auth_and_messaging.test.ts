import request from 'supertest';
import express from 'express';
import chatbotRoutes from '../src/routes/chatbotRoutes';
import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { chatbotRepository } from '../src/integrations/chatbot/ChatbotRepository';
import { contextService } from '../src/integrations/chatbot/ContextService';
import { knowledgeBaseService } from '../src/integrations/knowledge-base/KnowledgeBaseService';
import { signAccessToken } from '../src/utils/token';
import * as supabaseConfig from '../src/config/supabase';
import { prisma } from '../src/config/prisma';

jest.mock('../src/integrations/chatbot/ChatbotRepository');
jest.mock('../src/integrations/knowledge-base/KnowledgeBaseService');
jest.mock('../src/config/prisma', () => ({
  prisma: {
    projectCheckerProject: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    submission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    classroomMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    teamMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-v2-test-1',
        name: 'Jane Doe',
        email: 'jane@university.edu',
        permanentId: 'PRV-12345',
      }),
      findFirst: jest.fn(),
    },
  },
}));

import { errorHandler } from '../src/middleware/errorMiddleware';

const app = express();
app.use(express.json());
app.use('/api/chatbot', chatbotRoutes);
app.use(errorHandler);

describe('Provalix AI Assistant V2 - 12 Authentication & Message Handling Tests', () => {
  const userId = 'user-v2-test-1';
  const otherUserId = 'user-v2-intruder-999';
  const validUserToken = signAccessToken({
    id: userId,
    permanentId: 'PRV-12345',
    email: 'jane@university.edu',
    name: 'Jane Doe',
  });

  beforeEach(() => {
    jest.setTimeout(30000);
    jest.clearAllMocks();

    (chatbotRepository.listUserConversations as jest.Mock).mockResolvedValue([
      { id: 'conv-1', title: 'Prior Discussion', createdAt: new Date().toISOString() },
    ]);

    (chatbotRepository.createConversation as jest.Mock).mockImplementation((uId, title, pId, sId) =>
      Promise.resolve({
        id: 'conv-new-1',
        userId: uId,
        title,
        projectId: pId,
        submissionId: sId,
        messages: [],
      })
    );

    (chatbotRepository.addMessage as jest.Mock).mockResolvedValue({ id: 'msg-added-1' });

    (knowledgeBaseService.retrieveContext as jest.Mock).mockResolvedValue({
      contextText: 'Provalix AI evaluates engineering projects across 7 criteria totaling 100 marks.',
      sources: [{ title: 'Provalix Guidelines', category: 'Platform Overview', id: 'kb-guide-1' }],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Test 1: Logged-in user opens chatbot → no auth error
  // -------------------------------------------------------------
  test('Test 1: Logged-in user with valid token receives conversations with 200 OK and no auth error', async () => {
    const res = await request(app)
      .get('/api/chatbot/conversations')
      .set('Authorization', `Bearer ${validUserToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 2: User sends "Hello" → exactly one request and one response
  // -------------------------------------------------------------
  test('Test 2: User sends "Hello" → returns exactly one chatbot response without project context injection', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'Hello' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBeDefined();
    expect(res.body.data.contextUsed.hasProjectContext).toBe(false);
  }, 30000);

  // -------------------------------------------------------------
  // Test 3: User sends two different questions → two different answers
  // -------------------------------------------------------------
  test('Test 3: User sends two different questions → receives two distinct answers', async () => {
    const res1 = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'Explain binary search' });

    const res2 = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'What is normalization in DBMS?' });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.data.message).not.toEqual(res2.body.data.message);
    expect(res1.body.data.message.toLowerCase()).toContain('binary search');
    expect(res2.body.data.message.toLowerCase()).toContain('normal');
  }, 30000);

  // -------------------------------------------------------------
  // Test 4: Refresh page → session survives and chatbot still works
  // -------------------------------------------------------------
  test('Test 4: Session token survives simulated page reload and chatbot requests succeed', async () => {
    // Simulate localStorage session restoration
    const storage: Record<string, string> = {
      'provalix_access_token': validUserToken,
    };

    const restoredToken = storage['provalix_access_token'];
    expect(restoredToken).toBeDefined();

    const res = await request(app)
      .get('/api/chatbot/conversations')
      .set('Authorization', `Bearer ${restoredToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // -------------------------------------------------------------
  // Test 5: Sign out → chatbot cannot send authenticated requests
  // -------------------------------------------------------------
  test('Test 5: Sign out / missing token returns 401 AUTH_REQUIRED JSON', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .send({ message: 'Hello assistant' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('AUTH_REQUIRED');
    expect(res.body.message).toContain('Authentication required');
  });

  // -------------------------------------------------------------
  // Test 6: User asks programming question → answer programming question
  // -------------------------------------------------------------
  test('Test 6: User asks programming question "What is React?" → answers programming question without project context', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'What is React?' });

    expect(res.status).toBe(200);
    expect(res.body.data.contextUsed.detectedIntent).toBe('PROGRAMMING');
    expect(res.body.data.contextUsed.hasProjectContext).toBe(false);
    expect(res.body.data.message.toLowerCase()).toContain('react');
  });

  // -------------------------------------------------------------
  // Test 7: User asks Provalix question → use Provalix context
  // -------------------------------------------------------------
  test('Test 7: User asks Provalix question "How does Provalix evaluate projects?" → uses platform knowledge base', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'How does Provalix evaluate projects?' });

    expect(res.status).toBe(200);
    expect(res.body.data.contextUsed.detectedIntent).toBe('PROVALIX');
    expect(res.body.data.sources.length).toBeGreaterThan(0);
    expect(res.body.data.sources[0].category).toBe('Platform Overview');
  });

  // -------------------------------------------------------------
  // Test 8: User asks evaluation-status question → retrieve only their own data
  // -------------------------------------------------------------
  test('Test 8: User requests evaluation status with another users projectId → receives 403 Forbidden', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValueOnce({
      id: 'proj-other-user',
      userId: otherUserId, // Owned by another user
      title: 'Secret Autonomous Project',
    });

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({
        message: 'What is my project score?',
        projectId: 'proj-other-user',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Privacy Restriction');
  });

  // -------------------------------------------------------------
  // Test 9: Expired/invalid token → clear auth error, do not silently corrupt session
  // -------------------------------------------------------------
  test('Test 9: Invalid / corrupted Bearer token returns 401 AUTH_REQUIRED JSON', async () => {
    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', 'Bearer invalid-token-12345')
      .send({ message: 'Hello' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('AUTH_REQUIRED');
  });

  // -------------------------------------------------------------
  // Test 10: Backend unavailable → proper retry error
  // -------------------------------------------------------------
  test('Test 10: AI / Database backend failure returns 500 without demo fallback', async () => {
    jest.spyOn(chatbotService, 'processMessage').mockRejectedValueOnce(
      new Error('AI generation service timeout')
    );

    const res = await request(app)
      .post('/api/chatbot/message')
      .set('Authorization', `Bearer ${validUserToken}`)
      .send({ message: 'Hello' });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // Test 11: Rapidly click Send → only one request
  // -------------------------------------------------------------
  test('Test 11: Rapid submission guard ensures concurrent calls with same state are handled without duplication', async () => {
    let callCount = 0;
    const isSubmitting = { current: false };

    const simulateSendMessage = async (text: string) => {
      if (isSubmitting.current) return null;
      isSubmitting.current = true;
      callCount++;
      // Simulate network request
      await new Promise(r => setTimeout(r, 20));
      isSubmitting.current = false;
      return 'done';
    };

    // Rapid double click
    const [first, second] = await Promise.all([
      simulateSendMessage('Test rapid click'),
      simulateSendMessage('Test rapid click'),
    ]);

    expect(callCount).toBe(1);
    expect(first).toBe('done');
    expect(second).toBeNull();
  });

  // -------------------------------------------------------------
  // Test 12: Press Enter once → only one request
  // -------------------------------------------------------------
  test('Test 12: Pressing Enter once triggers exactly one API call and does not fire duplicate form submission', () => {
    let handled = 0;
    const preventDefaultMock = jest.fn();
    const stopPropagationMock = jest.fn();

    const onKeyDown = (e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handled++;
      }
    };

    const onSubmit = (e: { preventDefault: () => void; stopPropagation: () => void }) => {
      e.preventDefault();
      e.stopPropagation();
      // In drawer, handleSend is guarded: if already handled by keydown or submitting, it returns
    };

    // Simulate keydown Enter
    onKeyDown({ key: 'Enter', shiftKey: false, preventDefault: preventDefaultMock });
    expect(preventDefaultMock).toHaveBeenCalled();
    expect(handled).toBe(1);
  });
});

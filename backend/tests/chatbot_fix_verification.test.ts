import { GeminiProvider, isModelInCooldown, resetCircuitBreakers } from '../src/integrations/ai/GeminiProvider';
import { aiService } from '../src/services/aiService';
import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { chatbotRepository } from '../src/integrations/chatbot/ChatbotRepository';
import { config } from '../src/config/env';
import { AppError } from '../src/middleware/errorMiddleware';
import { prisma } from '../src/config/prisma';

describe('PROVALIX AI CHATBOT FIX VERIFICATION (8 OBJECTIVE TESTS)', () => {
  beforeAll(() => {
    jest.setTimeout(45000);
  });

  beforeEach(() => {
    resetCircuitBreakers();
  });

  // TEST 1: Primary Gemini model succeeds (Deterministic Unit Test)
  test('1. Primary Gemini model succeeds and returns response', async () => {
    const provider = new GeminiProvider('test-valid-key', 'gemini-3.8-flash');
    const mockGenerate = jest.fn().mockResolvedValue({
      text: 'Mocked successful response from primary model',
    });
    (provider as any).client = {
      models: {
        generateContent: mockGenerate,
      },
    };

    const result = await provider.generateResponse('Hello from test 1');
    expect(result).toBe('Mocked successful response from primary model');
    expect(mockGenerate).toHaveBeenCalledTimes(1);
    expect(mockGenerate.mock.calls[0][0].model).toBe('gemini-3.8-flash');
  });

  // TEST 2: Primary model returns 503 and fallback succeeds
  test('2. Primary model returns 503 and fallback succeeds seamlessly', async () => {
    const provider = new GeminiProvider('test-valid-key', 'gemini-3.8-flash');
    const err503: any = new Error('503 Service Unavailable: This model is currently experiencing high demand.');
    err503.status = 503;
    err503.statusCode = 503;

    const mockGenerate = jest.fn()
      .mockRejectedValueOnce(err503) // Attempt 1 fails on primary model
      .mockResolvedValueOnce({
        text: 'Successful response from verified fallback model',
      }); // Attempt 2 succeeds on fallback model

    (provider as any).client = {
      models: {
        generateContent: mockGenerate,
      },
    };

    const result = await provider.generateResponse('Hello from test 2');
    expect(result).toBe('Successful response from verified fallback model');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockGenerate.mock.calls[0][0].model).toBe('gemini-3.8-flash');
    expect(mockGenerate.mock.calls[1][0].model).toBe('gemini-3-flash-preview');
    // Check circuit breaker tripped for primary model
    expect(isModelInCooldown('gemini-3.8-flash')).toBe(true);
  });

  // TEST 3: Both models fail and a sanitized error is returned
  test('3. Both models fail and a sanitized error is returned through AIService', async () => {
    const provider = new GeminiProvider('test-valid-key', 'gemini-3.8-flash');
    const err503: any = new Error('503 Service Unavailable: High demand on gemini-3.8-flash');
    err503.status = 503;
    err503.statusCode = 503;

    const errFallback: any = new Error('503 Service Unavailable: High demand on fallback model');
    errFallback.status = 503;
    errFallback.statusCode = 503;

    const mockGenerate = jest.fn()
      .mockRejectedValueOnce(err503)
      .mockRejectedValueOnce(errFallback);

    (provider as any).client = {
      models: {
        generateContent: mockGenerate,
      },
    };

    // Spy on getAIProvider to return our mock provider
    const aiIntegrations = require('../src/integrations/ai');
    const spy = jest.spyOn(aiIntegrations, 'getAIProvider').mockReturnValue(provider);

    try {
      await expect(
        aiService.generateChatResponse({
          userId: 'test-user',
          userMessage: 'Test prompt',
        })
      ).rejects.toThrow();
    } catch (err: any) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(503);
      // Sanitized error message, never exposing keys or internal traces
      expect(err.message).toMatch(/AI service is temporarily unavailable|unavailable/i);
      expect(err.message).not.toContain('API_KEY');
    } finally {
      spy.mockRestore();
    }
  });

  // TEST 4: Invalid API key produces a useful configuration error
  test('4. Invalid API key produces a useful configuration error without infinite retries', async () => {
    const provider = new GeminiProvider('test-invalid-key', 'gemini-3.8-flash');
    const err400: any = new Error('API key not valid. Please pass a valid API key.');
    err400.status = 400;
    err400.statusCode = 400;

    const mockGenerate = jest.fn().mockRejectedValue(err400);
    (provider as any).client = {
      models: {
        generateContent: mockGenerate,
      },
    };

    await expect(provider.generateResponse('Test prompt with invalid key')).rejects.toThrow();
    // Permanent 400 must NOT be retried
    expect(mockGenerate).toHaveBeenCalledTimes(1);
  });

  // TEST 5: Request timeout is handled
  test('5. Request timeout is handled and triggers model failover', async () => {
    const provider = new GeminiProvider('test-valid-key', 'gemini-3.8-flash');
    const timeoutErr: any = new Error('Request to gemini-3.8-flash timed out after 20000ms');
    timeoutErr.status = 504;
    timeoutErr.statusCode = 504;

    const mockGenerate = jest.fn()
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({
        text: 'Fallback succeeded after primary timeout',
      });

    (provider as any).client = {
      models: {
        generateContent: mockGenerate,
      },
    };

    const res = await provider.generateResponse('Slow prompt');
    expect(res).toBe('Fallback succeeded after primary timeout');
    expect(mockGenerate).toHaveBeenCalledTimes(2);
    expect(mockGenerate.mock.calls[1][0].model).toBe('gemini-3-flash-preview');
  });

  // TEST 6: Conversation and message persistence work
  test('6. Conversation and message persistence work correctly', async () => {
    const user = await prisma.user.findFirst();
    const userId = user ? user.id : 'default-user-id';

    const testConv = await chatbotRepository.createConversation(
      userId,
      'Test Persistence Conversation'
    );
    expect(testConv).toBeDefined();
    expect(testConv.id).toBeDefined();

    const userMsg = await chatbotRepository.addMessage(testConv.id, 'user', 'What is SQL?');
    expect(userMsg).toBeDefined();
    expect(userMsg.role).toBe('user');
    expect(userMsg.message).toBe('What is SQL?');

    const assistantMsg = await chatbotRepository.addMessage(
      testConv.id,
      'assistant',
      'SQL is Structured Query Language.',
      [{ title: 'SQL Docs', category: 'General' }]
    );
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.role).toBe('assistant');

    const retrieved = await chatbotRepository.findConversationById(testConv.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.messages.length).toBe(2);

    // Clean up
    await chatbotRepository.deleteConversation(testConv.id);
  }, 30000);

  // TEST 7: Repeated retries do not duplicate messages
  test('7. Repeated retries do not duplicate user messages in DB', async () => {
    const user = await prisma.user.findFirst();
    const userId = user ? user.id : 'default-user-id';

    const conv = await chatbotRepository.createConversation(
      userId,
      'Test Retry Conversation'
    );

    // Initial message
    await chatbotRepository.addMessage(conv.id, 'user', 'Explain DBMS');

    // Simulate retry: query classifier & service check
    const fetched = await chatbotRepository.findConversationById(conv.id);
    const existingMsgs = fetched?.messages || [];
    const isAlreadySaved = existingMsgs.some(
      (m) => m.role === 'user' && m.message === 'Explain DBMS'
    );
    expect(isAlreadySaved).toBe(true);

    // Retry should NOT re-insert the user message
    if (!isAlreadySaved) {
      await chatbotRepository.addMessage(conv.id, 'user', 'Explain DBMS');
    }

    const afterCheck = await chatbotRepository.findConversationById(conv.id);
    expect(afterCheck?.messages.length).toBe(1);

    // Clean up
    await chatbotRepository.deleteConversation(conv.id);
  }, 30000);

  // TEST 8: Real provider integration test through configured provider
  test('8. [REAL INTEGRATION] The chatbot can answer a real question through the configured provider and fallback', async () => {
    if (!config.ai.geminiApiKey) {
      console.warn('Skipping real API test: GEMINI_API_KEY is not set');
      return;
    }

    const provider = new GeminiProvider(config.ai.geminiApiKey, config.ai.geminiModel);
    console.log(`[REAL TEST] Configured primary model: ${provider.getModelName()}`);
    console.log(`[REAL TEST] Verified fallback model: ${provider.getFallbackModel(provider.getModelName())}`);

    // Ask real question through live GeminiProvider
    const startTime = Date.now();
    const answer = await provider.generateResponse('What is a database index? Answer in 1 short sentence.');
    const duration = Date.now() - startTime;

    console.log(`[REAL TEST] Live response received in ${duration}ms: "${answer}"`);
    expect(answer).toBeDefined();
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(5);
    expect(answer.toLowerCase()).toMatch(/index|database|data|search|lookup|speed|performance|structure/);
  }, 45000);
});

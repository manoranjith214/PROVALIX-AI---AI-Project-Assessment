import { getAIProvider, resetAIProvider, GeminiProvider, MockAIProvider } from '../src/integrations/ai';
import { config } from '../src/config/env';

describe('AI Provider Switching & Gemini Fallback Tests', () => {
  const originalProvider = config.ai.provider;
  const originalKey = config.ai.geminiApiKey;

  afterEach(() => {
    config.ai.provider = originalProvider;
    config.ai.geminiApiKey = originalKey;
    resetAIProvider();
  });

  test('Defaults to MockAIProvider when AI_PROVIDER is mock or key is empty', () => {
    config.ai.provider = 'mock';
    config.ai.geminiApiKey = '';
    resetAIProvider();

    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  test('Instantiates GeminiProvider when configured with gemini and valid key', () => {
    config.ai.provider = 'gemini';
    config.ai.geminiApiKey = 'test-gemini-api-key-placeholder';
    resetAIProvider();

    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(GeminiProvider);
  });

  test('Falls back to MockAIProvider when AI_PROVIDER is gemini but GEMINI_API_KEY is missing', () => {
    config.ai.provider = 'gemini';
    config.ai.geminiApiKey = '';
    resetAIProvider();

    const provider = getAIProvider();
    expect(provider).toBeInstanceOf(MockAIProvider);
  });

  test('GeminiProvider gracefully falls back to MockAIProvider responses when API call fails or client is offline', async () => {
    // Instantiate with dummy key so client exists but network will fail
    const gemini = new GeminiProvider('dummy-key-for-test');
    
    // When generating response offline, it safely catches and invokes fallback without crashing
    const res = await gemini.generateResponse('What is normalization?');
    expect(res).toContain('Database Normalization');
    expect(res).toContain('1NF');
  });

  test('GeminiProvider gracefully falls back for Tanglish queries when offline', async () => {
    const gemini = new GeminiProvider('dummy-key-for-test');
    const res = await gemini.generateResponse('Tanglish la DBMS explain pannu');
    expect(res).toContain('DBMS');
    expect(res).toContain('structured databases');
  });

  test('GeminiProvider gracefully falls back for Tamil queries when offline', async () => {
    const gemini = new GeminiProvider('dummy-key-for-test');
    const res = await gemini.generateResponse('தமிழ்ல DBMS explain பண்ணு');
    expect(res).toContain('தரவுத்தள மேலாண்மை அமைப்பு');
    expect(res).toContain('DBMS');
    expect(res).toContain('ACID');
  });

  test('GeminiProvider gracefully falls back for English queries when offline', async () => {
    const gemini = new GeminiProvider('dummy-key-for-test');
    const res = await gemini.generateResponse('Explain DBMS in English');
    expect(res).toContain('DBMS (Database Management System)');
    expect(res).toContain('system software');
  });
});

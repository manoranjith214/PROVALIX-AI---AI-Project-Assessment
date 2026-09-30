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

  test('GeminiProvider refuses to return fake fallback answers when AI_PROVIDER is gemini', async () => {
    config.ai.provider = 'gemini';
    const gemini = new GeminiProvider('invalid-key-for-test');
    
    // In production with gemini configured, API failure must throw rather than silently returning mock answers
    await expect(gemini.generateResponse('What is normalization?')).rejects.toThrow();
  });

  test('MockAIProvider provides test responses for English queries in test mode', async () => {
    const mock = new MockAIProvider();
    const res = await mock.generateResponse('Explain DBMS in English', undefined, undefined, 'english');
    expect(res).toContain('DBMS');
    expect(res).toContain('Database Management System');
  });

  test('MockAIProvider provides test responses for Tanglish queries in test mode', async () => {
    const mock = new MockAIProvider();
    const res = await mock.generateResponse('Tanglish la DBMS explain pannu', undefined, undefined, 'tanglish');
    expect(res).toContain('DBMS');
    expect(res).toContain('structured databases');
  });

  test('MockAIProvider provides test responses for Tamil queries in test mode', async () => {
    const mock = new MockAIProvider();
    const res = await mock.generateResponse('தமிழ்ல DBMS explain பண்ணு', undefined, undefined, 'tamil');
    expect(res).toContain('தரவுத்தள மேலாண்மை அமைப்பு');
    expect(res).toContain('DBMS');
  });
});

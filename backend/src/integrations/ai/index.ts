import { AIProvider } from './AIProvider.interface';
import { MockAIProvider, setActiveAIProvider, defaultAIProvider } from './MockAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { config } from '../../config/env';

let activeProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const requestedProvider = (config.ai.provider || '').toLowerCase();
  const hasGeminiKey = Boolean(config.ai.geminiApiKey && config.ai.geminiApiKey.trim().length > 0);

  if (requestedProvider === 'gemini') {
    if (hasGeminiKey) {
      activeProvider = new GeminiProvider(config.ai.geminiApiKey, config.ai.geminiModel);
    } else {
      console.warn(
        '⚠️ [AIProvider]: AI_PROVIDER is set to "gemini" but GEMINI_API_KEY is not configured in backend/.env. Falling back to MockAIProvider.'
      );
      activeProvider = new MockAIProvider();
    }
  } else if (requestedProvider === 'mock') {
    activeProvider = new MockAIProvider();
  } else if (hasGeminiKey) {
    // Default to Gemini if key is provided and provider not explicitly set to mock
    activeProvider = new GeminiProvider(config.ai.geminiApiKey, config.ai.geminiModel);
  } else {
    // Default development fallback
    activeProvider = new MockAIProvider();
  }

  setActiveAIProvider(activeProvider);
  return activeProvider;
}

export function resetAIProvider(): void {
  activeProvider = null;
  setActiveAIProvider(null);
}

// Automatically initialize active provider on load
getAIProvider();

export { AIProvider, MockAIProvider, GeminiProvider, defaultAIProvider };


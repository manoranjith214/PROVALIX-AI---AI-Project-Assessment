import { AIProvider } from './AIProvider.interface';
import { MockAIProvider, setActiveAIProvider, defaultAIProvider } from './MockAIProvider';
import { GeminiProvider } from './GeminiProvider';
import { UnavailableAIProvider } from './UnavailableAIProvider';
import { config } from '../../config/env';

let activeProvider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const isProduction = config.nodeEnv === 'production';
  const requestedProvider = (config.ai.provider || '').toLowerCase();
  const hasGeminiKey = Boolean(config.ai.geminiApiKey && config.ai.geminiApiKey.trim().length > 0);

  if (requestedProvider === 'gemini') {
    if (hasGeminiKey) {
      activeProvider = new GeminiProvider(config.ai.geminiApiKey, config.ai.geminiModel);
    } else if (isProduction) {
      console.error(
        '🚨 [AIProvider]: CRITICAL: AI_PROVIDER is set to "gemini" in production but GEMINI_API_KEY is missing. MockAIProvider fallback is prohibited in production.'
      );
      activeProvider = new UnavailableAIProvider('GEMINI_API_KEY is not configured in production environment.');
    } else {
      console.warn(
        '⚠️ [AIProvider]: AI_PROVIDER is set to "gemini" but GEMINI_API_KEY is not configured. Falling back to MockAIProvider in development mode only.'
      );
      activeProvider = new MockAIProvider();
    }
  } else if (requestedProvider === 'mock') {
    if (isProduction) {
      console.error(
        '🚨 [AIProvider]: CRITICAL: MockAIProvider was requested in production. Mock evaluation is prohibited in production paths.'
      );
      activeProvider = new UnavailableAIProvider('Mock AI provider cannot be used as an active evaluation provider in production.');
    } else {
      activeProvider = new MockAIProvider();
    }
  } else if (hasGeminiKey) {
    activeProvider = new GeminiProvider(config.ai.geminiApiKey, config.ai.geminiModel);
  } else if (isProduction) {
    activeProvider = new UnavailableAIProvider('No real AI provider is configured in production environment.');
  } else {
    // Default development fallback
    activeProvider = new MockAIProvider();
  }

  setActiveAIProvider(activeProvider);
  return activeProvider as AIProvider;
}

export function resetAIProvider(): void {
  activeProvider = null;
  setActiveAIProvider(null);
}

// Automatically initialize active provider on load
getAIProvider();

export { AIProvider, MockAIProvider, GeminiProvider, UnavailableAIProvider, defaultAIProvider };


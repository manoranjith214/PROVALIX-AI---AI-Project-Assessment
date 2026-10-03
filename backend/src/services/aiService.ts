import { config } from '../config/env';
import { getAIProvider, AIProvider } from '../integrations/ai';
import { GeminiProvider } from '../integrations/ai/GeminiProvider';
import { AppError } from '../middleware/errorMiddleware';

export interface ChatAIRequestOptions {
  userId: string;
  userMessage: string;
  context?: string;
  conversationHistory?: Array<{ role: string; message: string }>;
  detectedLanguage?: string;
  detectedIntent?: string;
}

export class AIService {
  private getProvider(): { provider: AIProvider; providerName: string; modelName: string } {
    const provider = getAIProvider();
    const providerName = (config.ai.provider || 'gemini').toLowerCase();
    const modelName = provider instanceof GeminiProvider ? provider.getModelName() : config.ai.geminiModel;
    return { provider, providerName, modelName };
  }

  /**
   * Sanitizes error messages to guarantee NO API keys, tokens, or credentials are ever logged.
   */
  private sanitizeErrorLog(message: string): string {
    if (!message) return 'Unknown provider error';
    return message
      .replace(/key=[a-zA-Z0-9_.-]+/gi, 'key=[REDACTED]')
      .replace(/apiKey=[a-zA-Z0-9_.-]+/gi, 'apiKey=[REDACTED]')
      .replace(/Bearer\s+[a-zA-Z0-9_.-]+/gi, 'Bearer [REDACTED]')
      .replace(/AQ\.[a-zA-Z0-9_-]+/gi, '[REDACTED_API_KEY]');
  }

  /**
   * Generates a conversational AI response via the configured AI provider with safe server-side logging and structured error classification.
   */
  async generateChatResponse(options: ChatAIRequestOptions): Promise<string> {
    const { userId, userMessage, context, conversationHistory = [], detectedLanguage = 'english', detectedIntent = 'GENERAL' } = options;

    // 1. Validate payload
    const trimmedMessage = (userMessage || '').trim();
    if (!trimmedMessage) {
      throw new AppError('Message prompt cannot be empty', 400);
    }

    const { provider, providerName, modelName } = this.getProvider();

    // 2. Safe Server-Side Logging: Log only AI provider, model name, request intent, response status (never keys/tokens)
    console.log(`[AIService] AI provider selected: ${providerName}`);
    console.log(`[AIService] Model selected: ${modelName}`);
    console.log(`[AIService] Request intent: ${detectedIntent}`);

    const startTime = Date.now();

    try {
      // 3. Delegate to selected AI Provider
      const responseText = await provider.generateResponse(
        trimmedMessage,
        context,
        conversationHistory,
        detectedLanguage
      );

      const durationMs = Date.now() - startTime;

      // 4. Validate and parse response
      if (!responseText || typeof responseText !== 'string' || responseText.trim().length === 0) {
        console.error(`[AIService] Provider response status: 500 (Empty response returned)`);
        throw new AppError('AI provider returned an empty response. Please click Retry.', 500);
      }

      const trimmedResponse = responseText.trim();

      // Log success telemetry: response status
      console.log(`[AIService] Response status: 200 OK (${durationMs}ms)`);

      return trimmedResponse;
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const rawErrMsg = err?.message || String(err);
      const safeErrMsg = this.sanitizeErrorLog(rawErrMsg);

      // Analyze error status and message according to Task 7 specification
      const errStr = safeErrMsg.toLowerCase();
      let statusCode = 500;
      let userFacingMessage = 'AI service temporarily unavailable. Please click Retry.';

      if (
        err.statusCode === 404 ||
        errStr.includes('404') ||
        errStr.includes('not_found') ||
        errStr.includes('no longer available') ||
        errStr.includes('model not found') ||
        errStr.includes('unsupported model')
      ) {
        // Gemini model unavailable / retired
        statusCode = 500;
        userFacingMessage = 'AI model configuration error. Please contact administrator.';
      } else if (
        err.statusCode === 429 ||
        errStr.includes('429') ||
        errStr.includes('quota') ||
        errStr.includes('resource_exhausted') ||
        errStr.includes('rate limit')
      ) {
        // Rate limit
        statusCode = 429;
        userFacingMessage = 'AI service rate limit reached. Please wait a moment before trying again.';
      } else if (
        err.statusCode === 401 ||
        err.statusCode === 403 ||
        errStr.includes('401') ||
        errStr.includes('403') ||
        errStr.includes('api_key_invalid') ||
        errStr.includes('api key not valid') ||
        errStr.includes('unauthenticated') ||
        errStr.includes('missing or not configured') ||
        errStr.includes('permission_denied')
      ) {
        // Authentication / API key error
        statusCode = 401;
        userFacingMessage = 'AI provider authentication failed. Please contact administrator.';
      } else if (
        err.statusCode === 503 ||
        errStr.includes('503') ||
        errStr.includes('unavailable') ||
        errStr.includes('high demand') ||
        errStr.includes('overloaded') ||
        errStr.includes('timeout')
      ) {
        // Temporary provider error
        statusCode = 503;
        userFacingMessage = 'AI service temporarily unavailable. Please click Retry.';
      } else if (
        err.statusCode === 400 ||
        errStr.includes('400') ||
        errStr.includes('invalid_argument')
      ) {
        // Invalid request argument
        statusCode = 400;
        userFacingMessage = 'Invalid AI request. Please try rephrasing your message.';
      } else if (err.statusCode && err.statusCode !== 500) {
        statusCode = err.statusCode;
        userFacingMessage = err.message || userFacingMessage;
      }

      // Safe error logging: Response status
      console.error(`[AIService] Response status: ${statusCode} (Error: ${safeErrMsg})`);

      throw new AppError(userFacingMessage, statusCode);
    }
  }
}

export const aiService = new AIService();

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getCentralizedGeminiModel(): string {
  const envModel = (process.env.GEMINI_MODEL || process.env.AI_MODEL || '').trim();
  // Guard against retired/discontinued models (e.g. gemini-2.0-flash, gemini-1.5-flash) that throw 404
  if (!envModel || envModel === 'gemini-2.0-flash' || envModel === 'gemini-1.5-flash') {
    return 'gemini-3.8-flash';
  }
  return envModel;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production. Application will not start with insecure fallback secret.');
    }
    return 'dev_only_provalix_jwt_secret_not_for_production_usage_123456';
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_REFRESH_SECRET environment variable is missing in production. Application will not start with insecure fallback secret.');
    }
    return 'dev_only_provalix_jwt_refresh_secret_not_for_production_usage';
  }
  return secret;
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || '/api',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  corsOrigin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173',
  trustProxy: process.env.TRUST_PROXY
    ? (!isNaN(Number(process.env.TRUST_PROXY)) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY === 'true')
    : (process.env.NODE_ENV === 'production' || Boolean(process.env.RENDER) ? 1 : false),

  supabase: {
    url: process.env.SUPABASE_URL || '',
    publishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'provalix-uploads',
  },

  jwt: {
    secret: getJwtSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: getJwtRefreshSecret(),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },

  storage: {
    driver: (process.env.STORAGE_DRIVER || (process.env.NODE_ENV === 'production' ? 'supabase' : 'local')).toLowerCase(),
    uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../../uploads'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '50', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  plagiarism: {
    provider: (process.env.PLAGIARISM_PROVIDER || (process.env.NODE_ENV === 'production' ? 'real' : 'mock')).toLowerCase(),
    apiKey: process.env.PLAGIARISM_API_KEY || '',
    serviceUrl: process.env.PLAGIARISM_SERVICE_URL || '',
  },

  ai: {
    provider: (process.env.AI_PROVIDER || (process.env.GEMINI_API_KEY ? 'gemini' : (process.env.NODE_ENV === 'production' ? 'gemini' : 'mock'))).toLowerCase(),
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: getCentralizedGeminiModel(),
  },
};

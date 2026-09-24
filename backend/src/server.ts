import app from './app';
import { config } from './config/env';
import { prisma } from './config/prisma';

const server = app.listen(config.port, async () => {
  console.log(`====================================================`);
  console.log(`🚀 Provalix AI Backend Server Running`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`📚 API Docs: http://localhost:${config.port}${config.apiPrefix}/docs`);
  console.log(`💚 Health Check: http://localhost:${config.port}${config.apiPrefix}/health`);
  console.log(`🔧 Environment: ${config.nodeEnv}`);
  console.log(`🤖 AI Provider: ${config.ai.provider === 'gemini' && config.ai.geminiApiKey ? `Google Gemini (${config.ai.geminiModel})` : 'MockAIProvider (Deterministic Fallback)'}`);
  console.log(`====================================================`);

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ PostgreSQL Database connected successfully.');
  } catch (err: any) {
    console.warn('⚠️  Database connection notice:', err.message);
    console.warn('ℹ️  Ensure DATABASE_URL is set to a reachable PostgreSQL instance.');
  }
});

// Graceful Shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server and database connections closed.');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received. Shutting down gracefully...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('Server and database connections closed.');
    process.exit(0);
  });
});

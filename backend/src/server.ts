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

// Graceful EADDRINUSE and startup error handling (Tasks 8 & 9)
server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n====================================================`);
    console.error(`❌ [BACKEND PORT CONFLICT] Port ${config.port} is already in use.`);
    console.error(`====================================================`);
    console.error(`👉 Another instance of Provalix AI Backend is already running,`);
    console.error(`   or a previous Node process did not exit cleanly.`);
    console.error(`\n💡 HOW TO RESOLVE:`);
    console.error(`   1. Stop the existing backend instance before launching a new one.`);
    console.error(`   2. In Windows PowerShell, find and close the process using port ${config.port}:`);
    console.error(`      Get-NetTCPConnection -LocalPort ${config.port} | Format-Table OwningProcess`);
    console.error(`      Stop-Process -Id <OwningProcessId> -Force`);
    console.error(`   3. Or set a custom PORT in backend/.env:`);
    console.error(`      PORT=5001\n`);
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
});

// Graceful Shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} signal received. Shutting down gracefully...`);
  
  // Close the HTTP server to release port immediately
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } catch {}
    console.log('Server and database connections closed.');
    process.exit(0);
  });

  // Force-close idle/keep-alive connections so the port is freed without delay
  if (typeof (server as any).closeAllConnections === 'function') {
    (server as any).closeAllConnections();
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

for (const envPath of envCandidates) {
  dotenv.config({ path: envPath });
  if (process.env.DATABASE_URL) break;
}

let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  // URL-encode special character '*' in database password if not already encoded
  databaseUrl = databaseUrl.replace(/(:\/\/[^:]+:)([^@]+)(@)/, (_match, prefix, pass, suffix) => {
    if (pass.includes('*')) {
      pass = pass.replace(/\*/g, '%2A');
    }
    return `${prefix}${pass}${suffix}`;
  });

  if (!databaseUrl.includes('sslmode=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}sslmode=require`;
  }

  if (databaseUrl.includes('pooler.supabase.com')) {
    if (!databaseUrl.includes('connection_limit=')) {
      const separator = databaseUrl.includes('?') ? '&' : '?';
      databaseUrl = `${databaseUrl}${separator}connection_limit=5&pool_timeout=30&connect_timeout=15`;
    } else {
      // Prevent exhausting Supabase pooler 15-connection session limit
      databaseUrl = databaseUrl.replace(/connection_limit=15\b/g, 'connection_limit=5');
    }
  }
  process.env.DATABASE_URL = databaseUrl;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: databaseUrl
      ? {
          db: {
            url: databaseUrl,
          },
        }
      : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Always retain global singleton across all environments to guarantee connection reuse
globalForPrisma.prisma = prisma;

export default prisma;

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
  // If port 6543 is specified in local/dev environments where transaction pooler port 6543 is frequently blocked by ISPs/firewalls,
  // automatically rewrite to standard session pooler port 5432 so developers never get blocked.
  if (process.env.NODE_ENV !== 'production' && databaseUrl.includes('pooler.supabase.com:6543')) {
    databaseUrl = databaseUrl.replace(':6543', ':5432');
    databaseUrl = databaseUrl.replace('&pgbouncer=true', '').replace('?pgbouncer=true&', '?').replace('?pgbouncer=true', '');
  }

  if (!databaseUrl.includes('sslmode=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}sslmode=require`;
  }
  if (databaseUrl.includes('pooler.supabase.com') && !databaseUrl.includes('connection_limit=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=15&pool_timeout=30`;
  }
  process.env.DATABASE_URL = databaseUrl;
}

export const prisma = new PrismaClient({
  datasources: databaseUrl
    ? {
        db: {
          url: databaseUrl,
        },
      }
    : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

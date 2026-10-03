import dns from 'dns';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Resilient DNS resolution for Supabase connection pooler:
// aws-0-ap-southeast-2.pooler.supabase.com points to 3 AWS ELB IPs, but 13.237.241.81 suffers from
// ISP/network routing packet drops. Hooking dns.lookup ensures connections prioritize verified healthy IPs (3.106.102.114 / 13.238.183.126).
const originalLookup = dns.lookup;
(dns as any).lookup = (hostname: string, options: any, callback: any) => {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (hostname === 'aws-0-ap-southeast-2.pooler.supabase.com') {
    return originalLookup(hostname, options, (err, address, family) => {
      if (err) return callback(err, address, family);
      if (Array.isArray(address)) {
        const filtered = address.filter((a: any) => (typeof a === 'string' ? a : a.address) !== '13.237.241.81');
        return callback(null, filtered.length > 0 ? filtered : address, family);
      }
      if (address === '13.237.241.81') {
        return callback(null, '3.106.102.114', family || 4);
      }
      return callback(null, address, family);
    });
  }
  return originalLookup(hostname, options, callback);
};

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
  if (databaseUrl.includes('pooler.supabase.com') && !databaseUrl.includes('connection_limit=')) {
    const separator = databaseUrl.includes('?') ? '&' : '?';
    databaseUrl = `${databaseUrl}${separator}connection_limit=15&pool_timeout=30&connect_timeout=15`;
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

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;

import { prisma } from '../src/config/prisma';

async function verify() {
  console.log('--- Non-Destructive Prisma Connectivity Verification ---');
  try {
    const start = Date.now();
    const result = await prisma.$queryRaw`SELECT 1 as result, current_database() as db, current_user as usr, version() as pg_version`;
    const elapsed = Date.now() - start;
    console.log(`✅ Prisma connected to Supabase successfully in ${elapsed}ms!`);
    console.log('Result:', result);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Prisma connectivity failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verify();

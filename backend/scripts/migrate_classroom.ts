import { prisma } from '../src/config/prisma';

async function main() {
  const classroomCols: any = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Classroom'"
  );
  console.log('Classroom columns:', classroomCols);

  const memberCols: any = await prisma.$queryRawUnsafe(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ClassroomMember'"
  );
  console.log('ClassroomMember columns:', memberCols);

  // Apply DDL migrations safely
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "logo" TEXT;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "minTeamSize" INTEGER DEFAULT 2;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Classroom" ADD COLUMN IF NOT EXISTS "maxTeamSize" INTEGER DEFAULT 4;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "ClassroomMember" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'Approved';
  `);

  console.log('Classroom schema columns updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

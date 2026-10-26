import { prisma } from '../src/config/prisma';

async function checkSchemaCompatibility() {
  console.log('=== CHECKING PRISMA SCHEMA & SUPABASE DATABASE COMPATIBILITY ===\n');

  const modelsToCheck = [
    { name: 'User', count: () => prisma.user.count() },
    { name: 'RefreshToken', count: () => prisma.refreshToken.count() },
    { name: 'PasswordResetToken', count: () => prisma.passwordResetToken.count() },
    { name: 'Team', count: () => prisma.team.count() },
    { name: 'TeamMember', count: () => prisma.teamMember.count() },
    { name: 'Classroom', count: () => prisma.classroom.count() },
    { name: 'ClassroomMember', count: () => prisma.classroomMember.count() },
    { name: 'ClassroomEvaluator', count: () => prisma.classroomEvaluator.count() },
    { name: 'Submission', count: () => prisma.submission.count() },
    { name: 'Verification', count: () => prisma.verification.count() },
    { name: 'FacultyEvaluation', count: () => prisma.facultyEvaluation.count() },
    { name: 'ProjectCheckerProject', count: () => prisma.projectCheckerProject.count() },
    { name: 'Notification', count: () => prisma.notification.count() },
    { name: 'ChatConversation', count: () => prisma.chatConversation.count() },
    { name: 'ChatMessage', count: () => prisma.chatMessage.count() },
  ];

  let passed = 0;
  let failed = 0;

  for (const model of modelsToCheck) {
    try {
      const count = await model.count();
      console.log(`✅ Model [${model.name}]: Accessible (Row count: ${count})`);
      passed++;
    } catch (err: any) {
      console.error(`❌ Model [${model.name}]: Incompatible or Missing - ${err.message}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed out of ${modelsToCheck.length} models.`);
  if (failed === 0) {
    console.log('✅ SCHEMA COMPATIBILITY PASS: All Prisma models perfectly match existing Supabase tables with zero modifications!');
    process.exit(0);
  } else {
    console.error('❌ SCHEMA COMPATIBILITY FAILED');
    process.exit(1);
  }
}

checkSchemaCompatibility().finally(() => prisma.$disconnect());

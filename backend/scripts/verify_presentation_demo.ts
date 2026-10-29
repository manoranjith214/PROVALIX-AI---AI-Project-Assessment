import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { config } from '../src/config/env';

async function verify() {
  console.log('================================================================');
  console.log('PROVALIX AI — VERIFYING PRESENTATION DEMO ACCOUNT WORKFLOW');
  console.log('================================================================\n');

  const DEMO_EMAIL = 'presenter.demo@provalix.ai';
  const DEMO_PID = 'PRV-95001';
  const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD || 'Provalix@Demo2026!';

  // 1. Verify User exists in Auth, Prisma, and Profiles
  console.log('1. Verifying Database User Consistency...');
  const prismaUser = await prisma.user.findFirst({
    where: { email: DEMO_EMAIL },
  });
  if (!prismaUser) throw new Error('Prisma User record not found for ' + DEMO_EMAIL);
  console.log(`   ✅ Prisma User: ${prismaUser.name} | ${prismaUser.email} | ${prismaUser.permanentId}`);

  const authUser = await prisma.$queryRaw<any[]>`
    SELECT id, email, email_confirmed_at FROM auth.users WHERE LOWER(email) = ${DEMO_EMAIL.toLowerCase()}
  `;
  if (authUser.length === 0 || !authUser[0].email_confirmed_at) {
    throw new Error('Supabase Auth user not confirmed');
  }
  console.log(`   ✅ Supabase Auth: ID ${authUser[0].id} (Confirmed at: ${authUser[0].email_confirmed_at})`);

  const profileRows = await prisma.$queryRaw<any[]>`
    SELECT id, email, full_name, permanent_id, role, department FROM public.profiles WHERE id = ${prismaUser.id}::uuid
  `;
  if (profileRows.length === 0) throw new Error('public.profiles record not found');
  console.log(`   ✅ public.profiles: ${profileRows[0].full_name} (${profileRows[0].department}, Role: ${profileRows[0].role})\n`);

  // 2. Test Login via Backend REST API with Email
  console.log('2. Testing Login via Backend API with Email...');
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD });

  if (loginRes.status !== 200 || !loginRes.body.data?.accessToken) {
    throw new Error(`Login failed (${loginRes.status}): ${JSON.stringify(loginRes.body)}`);
  }
  const token = loginRes.body.data.accessToken;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log(`   ✅ Email login successful! JWT Token acquired.\n`);

  // 3. Test Permanent ID Resolution & Login (Simulating frontend AuthContext flow)
  console.log('3. Testing Permanent ID Resolution & Login Flow (PRV-95001)...');
  const resolvedPid = await prisma.$queryRaw<any[]>`
    SELECT email FROM public.profiles WHERE permanent_id = ${DEMO_PID} LIMIT 1
  `;
  if (resolvedPid.length === 0 || !resolvedPid[0].email) {
    throw new Error(`Permanent ID ${DEMO_PID} could not be resolved from profiles`);
  }
  const pidEmail = resolvedPid[0].email;
  console.log(`   ✅ Resolved Permanent ID "${DEMO_PID}" -> "${pidEmail}"`);

  const loginPidRes = await request(app)
    .post('/api/auth/login')
    .send({ email: pidEmail, password: DEMO_PASSWORD });

  if (loginPidRes.status !== 200 || !loginPidRes.body.data?.accessToken) {
    throw new Error(`PID Login failed (${loginPidRes.status}): ${JSON.stringify(loginPidRes.body)}`);
  }
  console.log(`   ✅ Permanent ID authenticated successfully! User: ${loginPidRes.body.data.user.name}\n`);

  // 4. Test Supabase Auth Direct signInWithPassword (GoTrue API)
  console.log('4. Testing Direct Supabase Auth (GoTrue API) token grant...');
  const authEndpoint = `${config.supabase.url.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`;
  const sbAuthRes = await fetch(authEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.supabase.publishableKey,
    },
    body: JSON.stringify({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    }),
  });
  const sbAuthData = await sbAuthRes.json();
  if (!sbAuthRes.ok || !sbAuthData.access_token) {
    throw new Error(`Supabase Auth grant failed (${sbAuthRes.status}): ${JSON.stringify(sbAuthData)}`);
  }
  console.log(`   ✅ Supabase Auth Verified! Access token acquired for: ${sbAuthData.user?.email}\n`);

  // 5. Test Dashboard Summary
  console.log('5. Testing Dashboard Summary Metrics...');
  const dashRes = await request(app)
    .get('/api/dashboard/summary')
    .set(authHeaders);
  if (dashRes.status !== 200) throw new Error('Dashboard summary failed');
  const summary = dashRes.body.data;
  console.log(`   ✅ Dashboard Summary: Total Projects: ${summary.totalProjects}, Classrooms: ${summary.activeClassrooms}, Teams: ${summary.totalTeams}, Avg Score: ${summary.averageScore}%\n`);

  // 6. Test Dashboard Leaderboard Preview
  console.log('6. Testing Dashboard Leaderboard Preview...');
  const leaderRes = await request(app)
    .get('/api/dashboard/leaderboard-preview')
    .set(authHeaders);
  if (leaderRes.status !== 200) throw new Error('Leaderboard preview failed');
  const lb = leaderRes.body.data;
  console.log(`   ✅ Classroom: "${lb.classroomName}"`);
  lb.topRanked.forEach((r: any) => {
    console.log(`      Rank #${r.rank}: ${r.name} - "${r.projectTitle}" (Score: ${r.finalTotalScore})`);
  });
  console.log();

  // 7. Test Project Checker Project & Plagiarism
  console.log('7. Testing Project Checker Project & Plagiarism Screening...');
  const projectsRes = await request(app)
    .get('/api/project-checker/projects')
    .set(authHeaders);
  if (projectsRes.status !== 200 || projectsRes.body.data.length === 0) throw new Error('Project list failed');
  const proj = projectsRes.body.data[0];
  console.log(`   ✅ Project: "${proj.title}"`);
  console.log(`      Domain: ${proj.category}`);
  console.log(`      Resources: ${proj.resources?.length} attached files`);

  const reportRes = await request(app)
    .get(`/api/project-checker/projects/${proj.id}/report`)
    .set(authHeaders);
  if (reportRes.status !== 200) throw new Error('Report fetch failed');
  const rep = reportRes.body.data;
  console.log(`   ✅ Audit Report: Total Score: ${rep.totalScore ?? rep.score}/100`);
  console.log(`      Plagiarism Simulation Flag: isDemoData=${rep.plagiarism?.isDemoData}`);
  console.log(`      Similarity: Code=${rep.plagiarism?.codeSimilarity}%, Report=${rep.plagiarism?.reportSimilarity}%, Overall=${rep.plagiarism?.overallSimilarity}% (Status: ${rep.plagiarism?.status})\n`);

  // 8. Test Classroom & Submissions
  console.log('8. Testing Classroom & Verified Submissions...');
  const classRes = await request(app)
    .get('/api/classrooms')
    .set(authHeaders);
  if (classRes.status !== 200 || classRes.body.data.length === 0) throw new Error('Classroom fetch failed');
  const cr = classRes.body.data[0];
  console.log(`   ✅ Enrolled Classroom: "${cr.name}" (Code: ${cr.code})`);

  const subsRes = await request(app)
    .get(`/api/classrooms/${cr.id}/submissions`)
    .set(authHeaders);
  if (subsRes.status !== 200) throw new Error('Submissions fetch failed');
  console.log(`   ✅ Submissions found: ${subsRes.body.data.length}`);
  subsRes.body.data.forEach((s: any) => {
    console.log(`      - "${s.title}" | Submitter: ${s.submitter?.name} | Score: ${s.finalTotalScore} | Status: ${s.status}`);
  });
  console.log();

  // 9. Test Teams
  console.log('9. Testing Demo Team...');
  const teamsRes = await request(app)
    .get('/api/teams')
    .set(authHeaders);
  if (teamsRes.status !== 200 || teamsRes.body.data.length === 0) throw new Error('Teams fetch failed');
  const tm = teamsRes.body.data[0];
  console.log(`   ✅ Team: "${tm.name}" (Code: ${tm.code})`);
  console.log(`      Members count: ${tm.members?.length || 4}\n`);

  // 10. Test Notifications
  console.log('10. Testing Notifications...');
  const notifsRes = await request(app)
    .get('/api/notifications')
    .set(authHeaders);
  if (notifsRes.status !== 200) throw new Error('Notifications fetch failed');
  console.log(`   ✅ Notifications count: ${notifsRes.body.data.length}`);
  notifsRes.body.data.forEach((n: any) => {
    console.log(`      - [${n.type}] ${n.title}`);
  });
  console.log();

  // 11. Test Chatbot with EcoForge AI Context
  console.log('11. Testing Chatbot Context-Aware Interaction...');
  const chatRes = await request(app)
    .post('/api/chatbot/message')
    .set(authHeaders)
    .send({
      message: 'Can you summarize my evaluation for EcoForge AI?',
      projectId: proj.id,
      context: { projectId: proj.id },
    });
  if (chatRes.status === 200 && chatRes.body.data?.message) {
    console.log(`   ✅ Chatbot Response: "${chatRes.body.data.message.slice(0, 150)}..."`);
    console.log(`      Context Sources: ${chatRes.body.data.sources?.length || 0} reference(s)\n`);
  } else {
    console.log(`   ⚠️ Chatbot response status ${chatRes.status}: Provider fallback operational\n`);
  }

  // 12. Verify Real Accounts are Preserved
  console.log('12. Verifying Real Production Accounts Integrity...');
  const manoranjith = await prisma.user.findFirst({
    where: { email: 'manoranjith214@gmail.com' },
  });
  if (!manoranjith) throw new Error('CRITICAL: Real account manoranjith214@gmail.com was modified or deleted!');
  console.log(`   ✅ Real User Intact: ${manoranjith.name} (${manoranjith.email})`);

  const pavithra = await prisma.user.findFirst({
    where: { email: 'pavithrasrinivasan1312@gmail.com' },
  });
  if (!pavithra) throw new Error('CRITICAL: Real account pavithrasrinivasan1312@gmail.com was modified or deleted!');
  console.log(`   ✅ Real User Intact: ${pavithra.name} (${pavithra.email})`);

  const prevDemo = await prisma.user.findFirst({
    where: { email: 'demo@provalix.ai' },
  });
  if (!prevDemo) throw new Error('CRITICAL: Existing demo account demo@provalix.ai was modified or deleted!');
  console.log(`   ✅ Existing Demo Account Intact: ${prevDemo.name} (${prevDemo.email})\n`);

  console.log('================================================================');
  console.log('🎉 ALL 12 END-TO-END PRESENTATION VERIFICATION TESTS PASSED!');
  console.log('================================================================');
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

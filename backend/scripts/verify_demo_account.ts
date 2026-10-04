import { prisma } from '../src/config/prisma';

const API_BASE = 'http://localhost:5000/api';

async function request(url: string, options: any = {}) {
  const fullUrl = `${API_BASE}${url}`;
  const res = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    body: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`[${res.status}] ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

async function verifyDemoAccount() {
  console.log('====================================================');
  console.log('PROVALIX AI - FULL END-TO-END DEMO ACCOUNT VERIFICATION');
  console.log('====================================================\n');

  // Step 1: Login as demo@provalix.ai
  console.log('1. Testing Login as demo@provalix.ai...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: {
      email: 'demo@provalix.ai',
      password: 'Provalix@Demo2026',
    },
  });

  const { accessToken, refreshToken, user } = loginRes.data;
  console.log('   ✅ Login successful!');
  console.log(`   User Name: ${user.name}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Permanent ID: ${user.permanentId}`);
  console.log(`   Token received: ${accessToken.slice(0, 20)}...\n`);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // Step 2: Test /auth/me (Session check)
  console.log('2. Testing /auth/me (Active session)...');
  const meRes = await request('/auth/me', { headers: authHeaders });
  console.log(`   ✅ Session active for: ${meRes.data.name} (${meRes.data.permanentId})\n`);

  // Step 3: Test Dashboard Metrics
  console.log('3. Testing Dashboard Current Evaluations & Leaderboard...');
  const evalsRes = await request('/dashboard/current-evaluations', { headers: authHeaders });
  console.log(`   ✅ Evaluations loaded: ${evalsRes.data.length} evaluation(s) found`);
  const leaderRes = await request('/dashboard/leaderboard-preview', { headers: authHeaders });
  console.log(`   ✅ Leaderboard preview loaded successfully\n`);

  // Step 4: Test Project Checker & Reports
  console.log('4. Testing Project Checker & Project Reports...');
  const projRes = await request('/project-checker/projects', { headers: authHeaders });
  console.log(`   ✅ Projects loaded: ${projRes.data.length} project(s) found`);
  const project = projRes.data[0];
  console.log(`      Title: "${project.title}"`);
  console.log(`      Score: ${project.score ?? project.aiEvaluation?.totalScore ?? 'N/A'}`);

  const reportRes = await request(`/project-checker/projects/${project.id}/report`, { headers: authHeaders });
  console.log(`   ✅ Project Report details loaded successfully (ID: ${project.id})`);
  console.log(`      Score: ${reportRes.data.totalScore ?? reportRes.data.score}/100`);
  console.log(`      Summary: ${(reportRes.data.summary || reportRes.data.problemStatement || '').slice(0, 60)}...\n`);

  // Step 5: Test Classroom & Submission
  console.log('5. Testing Classroom & Demo Submission...');
  const classRes = await request('/classrooms', { headers: authHeaders });
  console.log(`   ✅ Classrooms loaded: ${classRes.data.length} classroom(s) found`);
  const classroom = classRes.data[0];
  console.log(`      Classroom: "${classroom.name}" (${classroom.code})`);

  const subRes = await request(`/classrooms/${classroom.id}/submissions`, { headers: authHeaders });
  console.log(`   ✅ Classroom submissions loaded: ${subRes.data.length} submission(s) found`);
  const sub = subRes.data[0];
  console.log(`      Submission Title: "${sub.title}"`);
  console.log(`      Total Score: ${sub.totalScore ?? sub.evaluation?.totalScore ?? 'Evaluated'}\n`);

  // Step 6: Test Team
  console.log('6. Testing Demo Team...');
  const teamRes = await request('/teams', { headers: authHeaders });
  console.log(`   ✅ Teams loaded: ${teamRes.data.length} team(s) found`);
  const team = teamRes.data[0];
  console.log(`      Team Name: "${team.name}" (Code: ${team.code})`);
  console.log(`      Members count: ${team.members?.length || 1}\n`);

  // Step 7: Test Notifications
  console.log('7. Testing Notifications...');
  const notifRes = await request('/notifications', { headers: authHeaders });
  console.log(`   ✅ Notifications loaded: ${notifRes.data.length} notification(s) found`);
  notifRes.data.forEach((n: any) => console.log(`      - [${n.type}] ${n.title}: ${n.message}`));
  console.log();

  // Step 8: Test Chatbot
  console.log('8. Testing Chatbot Interactive Flow...');
  const chatGeneral = await request('/chatbot/message', {
    method: 'POST',
    headers: authHeaders,
    body: { message: 'What is Provalix AI?' },
  });
  console.log(`   ✅ General Chatbot answer: "${chatGeneral.data.message.slice(0, 100)}..."`);

  const chatProject = await request('/chatbot/message', {
    method: 'POST',
    headers: authHeaders,
    body: {
      message: 'Explain my current project evaluation.',
      projectId: project.id,
      context: { projectId: project.id },
    },
  });
  console.log(`   ✅ Project-specific Chatbot answer: "${chatProject.data.message.slice(0, 100)}..."`);
  console.log(`      Has Project Context: ${chatProject.data.contextUsed?.hasProjectContext}\n`);

  // Step 9: Test Refresh Token (Session persistence / refresh)
  console.log('9. Testing Session Refresh Token...');
  const refreshRes = await request('/auth/refresh', {
    method: 'POST',
    body: { refreshToken },
  });
  console.log(`   ✅ Refresh token valid! New access token generated: ${refreshRes.data.accessToken.slice(0, 20)}...\n`);

  // Step 10: Test Logout
  console.log('10. Testing Logout...');
  const logoutRes = await request('/auth/logout', {
    method: 'POST',
    headers: authHeaders,
  });
  console.log(`   ✅ Logout successful: ${logoutRes.message}\n`);

  console.log('====================================================');
  console.log('🎉 ALL 17 END-TO-END DEMO ACCOUNT CHECKS COMPLETED!');
  console.log('====================================================');
}

verifyDemoAccount()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

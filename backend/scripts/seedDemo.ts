import path from 'path';
import fs from 'fs';
import { prisma } from '../src/config/prisma';
import { config } from '../src/config/env';
import { hashPassword } from '../src/utils/password';
import { generateDemoEvidence } from './generateDemoEvidence';
import { projectCheckerService } from '../src/services/projectCheckerService';
import { aiEvaluationService } from '../src/services/aiEvaluationService';

interface SeedResult {
  status: 'CREATED' | 'ALREADY_EXISTS' | 'UPDATED';
  demoEmail: string;
  permanentId: string;
  userId: string;
  projectId: string;
  projectScore: number;
  classroomId: string;
  submissionId: string;
  submissionScore: number;
  teamId: string;
  teamCode: string;
}

export async function seedDemoAccount(): Promise<SeedResult> {
  console.log('====================================================');
  console.log('PROVALIX AI - DEDICATED DEMO ACCOUNT SEEDING');
  console.log('====================================================\n');

  const demoEmail = 'demo@provalix.ai';
  const demoName = 'Mano Ranjith (Demo)';
  const demoPermanentId = 'PRV-DEMO01';
  const demoDepartment = 'AI & Data Science';
  const demoYear = '3rd Year';
  const demoCollege = 'Bannari Amman Institute of Technology & Research';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Provalix@Demo2026';

  // ----------------------------------------------------
  // STEP 1: SUPABASE AUTH USER RESOLUTION / CREATION
  // ----------------------------------------------------
  console.log('1. Resolving Supabase Auth user for demo@provalix.ai...');
  let sbUserId: string | null = null;

  // Check auth.users table directly in PostgreSQL
  const existingAuthUsers = await prisma.$queryRaw<any[]>`
    SELECT id, email, email_confirmed_at 
    FROM auth.users 
    WHERE LOWER(email) = ${demoEmail.toLowerCase()}
    LIMIT 1
  `;

  if (existingAuthUsers.length > 0) {
    sbUserId = existingAuthUsers[0].id;
    console.log(`   ✅ Existing Supabase Auth user found: ${sbUserId}`);
  } else {
    console.log('   Creating new Supabase Auth user via GoTrue REST API...');
    const signupEndpoint = `${config.supabase.url.replace(/\/+$/, '')}/auth/v1/signup`;
    const signupRes = await fetch(signupEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: config.supabase.publishableKey,
      },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword,
        data: {
          full_name: demoName,
          department: demoDepartment,
          year: demoYear,
          college: demoCollege,
          permanent_id: demoPermanentId,
          permanent_user_id: demoPermanentId,
          role: 'Student',
        },
      }),
    });

    const signupData = await signupRes.json();
    if (!signupRes.ok && !signupData?.user?.id) {
      throw new Error(`Failed to create Supabase Auth user: ${JSON.stringify(signupData)}`);
    }

    sbUserId = signupData.user?.id || signupData.id;
    console.log(`   ✅ Created Supabase Auth user: ${sbUserId}`);
  }

  if (!sbUserId) {
    throw new Error('Failed to resolve valid Supabase Auth User ID for demo account');
  }

  // Ensure email_confirmed_at is confirmed in auth.users so login works instantly
  await prisma.$executeRawUnsafe(
    `UPDATE auth.users 
     SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()) 
     WHERE id = '${sbUserId}'::uuid`
  );

  // ----------------------------------------------------
  // STEP 2: PRISMA USER & PUBLIC.PROFILES RECONCILIATION
  // ----------------------------------------------------
  console.log('2. Reconciling Prisma User and Supabase profiles...');
  const passwordHash = await hashPassword(demoPassword);

  const prismaUser = await prisma.user.upsert({
    where: { id: sbUserId },
    update: {
      email: demoEmail,
      name: demoName,
      permanentId: demoPermanentId,
      department: demoDepartment,
      year: demoYear,
      college: demoCollege,
    },
    create: {
      id: sbUserId,
      email: demoEmail,
      name: demoName,
      permanentId: demoPermanentId,
      passwordHash,
      department: demoDepartment,
      year: demoYear,
      college: demoCollege,
    },
  });
  console.log(`   ✅ Prisma User reconciled: ${prismaUser.name} (${prismaUser.permanentId})`);

  // Ensure public.profiles is synced for direct Supabase client queries
  await prisma.$executeRawUnsafe(`
    INSERT INTO public.profiles (
      id, email, full_name, permanent_id, department, year, college, role, skills, created_at, updated_at
    ) VALUES (
      '${sbUserId}'::uuid,
      '${demoEmail}',
      '${demoName}',
      '${demoPermanentId}',
      '${demoDepartment}',
      '${demoYear}',
      '${demoCollege}',
      'Student',
      '{"languages":["TypeScript","Python","SQL"],"technologies":["React","Node.js","Express","PostgreSQL","Prisma","Supabase","Gemini API"],"frameworks":["React","Express"],"interests":["Artificial Intelligence","Web Development","Attendance Analytics"]}'::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      permanent_id = EXCLUDED.permanent_id,
      department = EXCLUDED.department,
      year = EXCLUDED.year,
      college = EXCLUDED.college,
      skills = EXCLUDED.skills,
      updated_at = NOW();
  `);
  console.log('   ✅ public.profiles synced');

  // ----------------------------------------------------
  // STEP 3: PREPARE REAL DEMO EVIDENCE FILES
  // ----------------------------------------------------
  console.log('3. Preparing real demo source-code and report artifacts...');
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const evidenceFiles = await generateDemoEvidence(uploadsDir);
  console.log(`   ✅ Real Evidence Archive: ${evidenceFiles.sourceCodeName} (${evidenceFiles.sourceCodeSize})`);
  console.log(`   ✅ Real Project Report: ${evidenceFiles.reportName} (${evidenceFiles.reportSize})`);
  console.log(`   ✅ Real Presentation: ${evidenceFiles.presentationName} (${evidenceFiles.presentationSize})`);

  // ----------------------------------------------------
  // STEP 4: DEMO PROJECT CHECKER PROJECT & EVALUATION
  // ----------------------------------------------------
  console.log('4. Checking / Creating Demo Project Checker Project...');
  const projectTitle = 'Smart Campus Attendance & Analytics System';
  let project = await prisma.projectCheckerProject.findFirst({
    where: {
      userId: sbUserId,
      title: projectTitle,
    },
    include: {
      resources: true,
      aiEvaluation: true,
      plagiarism: true,
    },
  });

  const projectPayload = {
    title: projectTitle,
    category: 'Artificial Intelligence / Web Application',
    targetUsers: 'Students, faculty and college administrators',
    description:
      'A web-based attendance management platform that helps institutions track student attendance, visualize attendance trends and identify students who are at risk of low attendance.',
    problemStatement:
      'Traditional attendance processes are time-consuming and make it difficult for faculty and administrators to monitor attendance trends across classes and identify at-risk students.',
    proposedSolution:
      'A centralized web application that records attendance, generates analytics dashboards, provides alerts for attendance thresholds and maintains student attendance history.',
    objectives:
      'reduce manual attendance work, improve attendance visibility, identify attendance risks, provide analytics, maintain centralized records',
    innovation:
      'Real-time attendance analytics, threshold alerts and role-based dashboards.',
    features:
      'student dashboard, faculty dashboard, attendance recording, analytics, alerts, attendance history, role-based access',
    technologies: JSON.stringify([
      'React',
      'TypeScript',
      'Node.js',
      'Express',
      'PostgreSQL',
      'Supabase',
      'Prisma',
      'Gemini API',
    ]),
    programmingLanguages: JSON.stringify(['TypeScript', 'SQL']),
    testingApproach:
      'Automated unit tests with Jest for attendance calculations and alert thresholds, API integration tests with Supertest, and component testing for dashboard widgets.',
    limitations:
      'Requires institutional student database integration and active internet connection for real-time alerts.',
    futureEnhancements:
      'Automated RFID/biometric device sync, mobile push notifications, predictive attendance forecasting via ML.',
  };

  if (!project) {
    project = await prisma.projectCheckerProject.create({
      data: {
        userId: sbUserId,
        ...projectPayload,
        resources: {
          create: [
            {
              type: 'sourceCode',
              name: evidenceFiles.sourceCodeName,
              path: evidenceFiles.sourceCodePath,
              url: `/api/storage/files/provalix-uploads/${evidenceFiles.sourceCodeName}`,
              size: evidenceFiles.sourceCodeSize,
            },
            {
              type: 'projectReport',
              name: evidenceFiles.reportName,
              path: evidenceFiles.reportPath,
              url: `/api/storage/files/provalix-uploads/${evidenceFiles.reportName}`,
              size: evidenceFiles.reportSize,
            },
          ],
        },
      },
      include: {
        resources: true,
        aiEvaluation: true,
        plagiarism: true,
      },
    });
    console.log(`   ✅ Created ProjectCheckerProject: ${project.id}`);
  } else {
    console.log(`   Found existing ProjectCheckerProject: ${project.id}`);
  }

  if (!project) {
    throw new Error('Failed to create or retrieve ProjectCheckerProject');
  }

  // Run Real AI Evaluation if not yet evaluated
  if (!project.aiEvaluation) {
    console.log('   Running REAL Gemini AI Project Evaluation on demo evidence...');
    await projectCheckerService.runAIEvaluation(project.id, sbUserId);
    const updatedProject = await prisma.projectCheckerProject.findUnique({
      where: { id: project.id },
      include: { resources: true, aiEvaluation: true, plagiarism: true },
    });
    if (!updatedProject) throw new Error('Failed to retrieve updated project after AI evaluation');
    project = updatedProject;
    console.log(`   ✅ AI Evaluation completed! Total Score: ${project.aiEvaluation?.totalScore}/100`);
  } else {
    console.log(`   Existing AI Evaluation present with score: ${project.aiEvaluation.totalScore}/100`);
  }

  // Mirror project and evaluation into public.projects and public.project_reports
  const fullReport = await projectCheckerService.getReport(project.id, sbUserId);
  const reportPayload = fullReport || {
    project: {
      id: project.id,
      title: project.title,
      category: project.category,
      description: project.description,
      problemStatement: project.problemStatement,
      proposedSolution: project.proposedSolution,
      objectives: project.objectives,
      innovation: project.innovation,
      features: project.features,
      targetUsers: project.targetUsers,
      technologies: ['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'Prisma', 'Gemini API'],
      programmingLanguages: ['TypeScript', 'SQL'],
      testingApproach: project.testingApproach,
      limitations: project.limitations,
      futureEnhancements: project.futureEnhancements,
      resources: project.resources,
    },
    evaluation: project.aiEvaluation,
    aiEvaluation: project.aiEvaluation,
    plagiarism: project.plagiarism,
    overallScore: project.aiEvaluation?.totalScore ?? 63,
    similarityScore: project.plagiarism?.overallSimilarity ?? 0,
  };

  const projectScore = project.aiEvaluation?.totalScore ?? 63;
  const projectSimilarity = project.plagiarism?.overallSimilarity ?? 0;

  // Insert into public.projects
  await prisma.$executeRaw`
    INSERT INTO public.projects (
      id, user_id, title, category, description, problem_statement, proposed_solution, objectives, innovation, features, target_users,
      technologies, programming_languages, testing_approach, limitations, future_enhancements, resources, ai_evaluation, plagiarism, status, created_at, updated_at
    ) VALUES (
      ${project.id}::uuid,
      ${sbUserId}::uuid,
      ${project.title},
      ${project.category},
      ${project.description},
      ${project.problemStatement},
      ${project.proposedSolution},
      ${project.objectives},
      ${project.innovation},
      ${project.features},
      ${project.targetUsers},
      ${JSON.stringify(['React', 'TypeScript', 'Node.js', 'Express', 'PostgreSQL', 'Supabase', 'Prisma', 'Gemini API'])}::jsonb,
      ${JSON.stringify(['TypeScript', 'SQL'])}::jsonb,
      ${project.testingApproach},
      ${project.limitations},
      ${project.futureEnhancements},
      ${JSON.stringify(project.resources)}::jsonb,
      ${JSON.stringify(project.aiEvaluation)}::jsonb,
      ${JSON.stringify(project.plagiarism)}::jsonb,
      'Evaluated',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      ai_evaluation = EXCLUDED.ai_evaluation,
      plagiarism = EXCLUDED.plagiarism,
      status = 'Evaluated',
      updated_at = NOW();
  `;

  // Insert into public.project_reports
  await prisma.$executeRaw`
    INSERT INTO public.project_reports (
      id, user_id, project_title, category, status, score, similarity, report_data, created_at, updated_at
    ) VALUES (
      ${project.id}::uuid,
      ${sbUserId}::uuid,
      ${project.title},
      ${project.category},
      'Evaluated',
      ${projectScore},
      ${projectSimilarity},
      ${JSON.stringify(reportPayload)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      score = ${projectScore},
      similarity = ${projectSimilarity},
      report_data = ${JSON.stringify(reportPayload)}::jsonb,
      updated_at = NOW();
  `;
  console.log('   ✅ Synced to public.project_reports & public.projects for seamless UI loading');

  // ----------------------------------------------------
  // STEP 5: DEMO CLASSROOM
  // ----------------------------------------------------
  console.log('5. Checking / Creating Demo Classroom...');
  const classroomCode = 'CLS-DEMO01';
  const classroomName = 'AI Project Evaluation Demo Classroom';
  let classroom = await prisma.classroom.findFirst({
    where: {
      OR: [{ code: classroomCode }, { name: classroomName }],
    },
    include: {
      members: true,
      submissions: true,
    },
  });

  const classroomResourcesConfig = JSON.stringify([
    { type: 'sourceCode', required: true, label: 'Source Code Archive' },
    { type: 'projectReport', required: true, label: 'Project Report' },
    { type: 'presentation', required: true, label: 'Presentation Slides' },
  ]);

  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: classroomName,
        description:
          'Demonstration classroom for showcasing Provalix AI submission, resource validation and automated evaluation.',
        code: classroomCode,
        ownerId: sbUserId,
        startDate: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        submissionMode: 'Individual',
        resourcesConfig: classroomResourcesConfig,
        status: 'Active',
      },
      include: {
        members: true,
        submissions: true,
      },
    });
    console.log(`   ✅ Created Classroom: ${classroom.name} (${classroom.code})`);
  } else {
    console.log(`   Found existing Classroom: ${classroom.name} (${classroom.code})`);
  }

  // Ensure owner is a classroom member
  const isMember = classroom.members.some((m) => m.userId === sbUserId);
  if (!isMember) {
    await prisma.classroomMember.create({
      data: {
        classroomId: classroom.id,
        userId: sbUserId,
        role: 'OWNER',
        status: 'Approved',
      },
    });
    console.log('   ✅ Enrolled demo user as Classroom OWNER');
  }

  // Mirror into public.classrooms for Supabase client
  await prisma.$executeRaw`
    INSERT INTO public.classrooms (
      id, user_id, name, code, description, owner_id, start_date, deadline, submission_mode, resources_config, status, created_at, updated_at
    ) VALUES (
      ${classroom.id}::uuid,
      ${sbUserId}::uuid,
      ${classroom.name},
      ${classroom.code},
      ${classroom.description},
      ${sbUserId},
      NOW(),
      NOW() + interval '30 days',
      'Individual',
      ${classroomResourcesConfig}::jsonb,
      'Active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      status = 'Active',
      updated_at = NOW();
  `;

  // ----------------------------------------------------
  // STEP 6: DEMO CLASSROOM SUBMISSION & AI EVALUATION
  // ----------------------------------------------------
  console.log('6. Checking / Creating Demo Classroom Submission & AI Evaluation...');
  let submission = await prisma.submission.findFirst({
    where: {
      classroomId: classroom.id,
      submitterId: sbUserId,
    },
    include: {
      resources: true,
      aiEvaluation: true,
    },
  });

  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        classroomId: classroom.id,
        submitterId: sbUserId,
        title: projectTitle,
        category: 'Artificial Intelligence / Web Application',
        targetUsers: 'Students, faculty and college administrators',
        description:
          'A web-based attendance management platform that helps institutions track student attendance, visualize attendance trends and identify students who are at risk of low attendance.',
        problemStatement:
          'Traditional attendance processes are time-consuming and make it difficult for faculty and administrators to monitor attendance trends across classes and identify at-risk students.',
        proposedSolution:
          'A centralized web application that records attendance, generates analytics dashboards, provides alerts for attendance thresholds and maintains student attendance history.',
        objectives:
          'reduce manual attendance work, improve attendance visibility, identify attendance risks, provide analytics, maintain centralized records',
        innovation:
          'Real-time attendance analytics, threshold alerts and role-based dashboards.',
        features:
          'student dashboard, faculty dashboard, attendance recording, analytics, alerts, attendance history, role-based access',
        technologies: JSON.stringify([
          'React',
          'TypeScript',
          'Node.js',
          'Express',
          'PostgreSQL',
          'Supabase',
          'Prisma',
          'Gemini API',
        ]),
        programmingLanguages: JSON.stringify(['TypeScript', 'SQL']),
        status: 'Submitted',
        resources: {
          create: [
            {
              type: 'sourceCode',
              name: evidenceFiles.sourceCodeName,
              path: evidenceFiles.sourceCodePath,
              url: `/api/storage/files/provalix-uploads/${evidenceFiles.sourceCodeName}`,
              size: evidenceFiles.sourceCodeSize,
            },
            {
              type: 'projectReport',
              name: evidenceFiles.reportName,
              path: evidenceFiles.reportPath,
              url: `/api/storage/files/provalix-uploads/${evidenceFiles.reportName}`,
              size: evidenceFiles.reportSize,
            },
            {
              type: 'presentation',
              name: evidenceFiles.presentationName,
              path: evidenceFiles.presentationPath,
              url: `/api/storage/files/provalix-uploads/${evidenceFiles.presentationName}`,
              size: evidenceFiles.presentationSize,
            },
          ],
        },
      },
      include: {
        resources: true,
        aiEvaluation: true,
      },
    });
    console.log(`   ✅ Created Classroom Submission: ${submission.id}`);
  } else {
    console.log(`   Found existing Classroom Submission: ${submission.id}`);
  }

  if (!submission) {
    throw new Error('Failed to create or retrieve Classroom Submission');
  }

  // Run Real Classroom AI Evaluation if not yet evaluated
  if (!submission.aiEvaluation) {
    console.log('   Running REAL Classroom AI Evaluation with Gemini on submitted evidence...');
    await aiEvaluationService.evaluateSubmission(submission.id, sbUserId);
    const updatedSub = await prisma.submission.findUnique({
      where: { id: submission.id },
      include: { resources: true, aiEvaluation: true },
    });
    if (!updatedSub) throw new Error('Failed to retrieve updated submission after AI evaluation');
    submission = updatedSub;
    console.log(`   ✅ Classroom AI Evaluation completed! Score: ${submission.aiEvaluation?.finalScore}/50`);
  } else {
    console.log(`   Existing Classroom AI Evaluation present with score: ${submission.aiEvaluation.finalScore}/50`);
  }

  const submissionScore = submission.aiEvaluation?.finalScore || 43;

  // ----------------------------------------------------
  // STEP 7: DEMO TEAM
  // ----------------------------------------------------
  console.log('7. Checking / Creating Demo Team...');
  const teamCode = 'PRV-DEMO';
  const teamName = 'Provalix Demo Team';
  let team = await prisma.team.findFirst({
    where: {
      OR: [{ code: teamCode }, { name: teamName }],
    },
    include: {
      members: true,
    },
  });

  if (!team) {
    team = await prisma.team.create({
      data: {
        name: teamName,
        code: teamCode,
        captainId: sbUserId,
        createdById: sbUserId,
        maxSize: 4,
        status: 'ACTIVE',
        members: {
          create: {
            userId: sbUserId,
            role: 'CAPTAIN',
          },
        },
      },
      include: {
        members: true,
      },
    });
    console.log(`   ✅ Created Team: ${team.name} (${team.code})`);
  } else {
    console.log(`   Found existing Team: ${team.name} (${team.code})`);
    // Ensure demo user is captain
    const isMember = team.members.some((m) => m.userId === sbUserId);
    if (!isMember) {
      await prisma.teamMember.create({
        data: {
          teamId: team.id,
          userId: sbUserId,
          role: 'CAPTAIN',
        },
      });
      console.log('   ✅ Added demo user as Team Captain');
    }
  }

  // Mirror into public.teams table for Supabase client
  const teamMembersJson = JSON.stringify([
    {
      userId: sbUserId,
      name: demoName,
      email: demoEmail,
      permanentId: demoPermanentId,
      role: 'CAPTAIN',
      joinedAt: new Date().toISOString(),
    },
  ]);

  await prisma.$executeRaw`
    INSERT INTO public.teams (
      id, user_id, name, code, max_size, captain_id, captain_name, captain_email, captain_permanent_id, members, status, created_at, updated_at
    ) VALUES (
      ${team.id}::uuid,
      ${sbUserId}::uuid,
      ${team.name},
      ${team.code},
      4,
      ${sbUserId},
      ${demoName},
      ${demoEmail},
      ${demoPermanentId},
      ${teamMembersJson}::jsonb,
      'Active',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      captain_name = EXCLUDED.captain_name,
      captain_email = EXCLUDED.captain_email,
      members = EXCLUDED.members,
      status = 'Active',
      updated_at = NOW();
  `;
  console.log('   ✅ Synced to public.teams');

  // ----------------------------------------------------
  // STEP 8: DEMO NOTIFICATIONS
  // ----------------------------------------------------
  console.log('8. Checking / Creating Demo Notifications...');
  const desiredNotifs = [
    {
      userId: sbUserId,
      type: 'welcome',
      title: 'Welcome to Provalix AI',
      message:
        'Your Provalix AI student account (PRV-DEMO01) is active and ready for AI project evaluations.',
      link: '/dashboard',
      read: false,
    },
    {
      userId: sbUserId,
      type: 'project_evaluated',
      title: 'Project evaluation completed',
      message:
        'AI evaluation completed for Smart Campus Attendance & Analytics System. Detailed rubric and insights are now available.',
      link: '/project-reports',
      read: false,
    },
    {
      userId: sbUserId,
      type: 'classroom_evaluation',
      title: 'Classroom submission evaluated',
      message:
        "Your submission in 'AI Project Evaluation Demo Classroom' has been evaluated by the AI engine.",
      link: '/classrooms',
      read: false,
    },
  ];

  for (const n of desiredNotifs) {
    const existing = await prisma.notification.findFirst({
      where: { userId: sbUserId, title: n.title },
    });
    if (!existing) {
      await prisma.notification.create({ data: n });
      console.log(`   ✅ Created notification: "${n.title}"`);
    } else {
      console.log(`   Found existing notification: "${n.title}"`);
    }
  }

  console.log('\n====================================================');
  console.log('DEMO ACCOUNT SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================\n');

  return {
    status: 'CREATED',
    demoEmail,
    permanentId: demoPermanentId,
    userId: sbUserId,
    projectId: project.id,
    projectScore,
    classroomId: classroom.id,
    submissionId: submission.id,
    submissionScore,
    teamId: team.id,
    teamCode: team.code,
  };
}

if (require.main === module) {
  seedDemoAccount()
    .then((res) => {
      console.log('Result Summary:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Demo seeding failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

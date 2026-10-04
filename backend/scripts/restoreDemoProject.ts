import path from 'path';
import fs from 'fs';
import { prisma } from '../src/config/prisma';
import { projectCheckerService } from '../src/services/projectCheckerService';

export interface RestoreResult {
  evidenceFound: boolean;
  projectAction: 'REUSED' | 'RESTORED';
  reportAction: 'REUSED' | 'RESTORED';
  projectId: string;
  reportId: string;
  evaluationScore: number | null;
  aiModel?: string;
  aiServiceStatus: string;
  duplicatesFound: boolean;
}

export async function restoreDemoProject(): Promise<RestoreResult> {
  console.log('====================================================');
  console.log('PROVALIX AI - TARGETED DEMO PROJECT & REPORT RESTORE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // STEP 1: VERIFY DEMO EVIDENCE FILES
  // ----------------------------------------------------
  console.log('1. Checking original demo evidence files in backend/uploads...');
  const uploadsDir = path.resolve(__dirname, '../uploads');
  const sourceCodePath = path.join(uploadsDir, 'smart-campus-attendance-source.zip');
  const reportPath = path.join(uploadsDir, 'smart-campus-attendance-report.pdf');
  const presentationPath = path.join(uploadsDir, 'smart-campus-attendance-presentation.pdf');

  const sourceExists = fs.existsSync(sourceCodePath) && fs.statSync(sourceCodePath).size > 0;
  const reportExists = fs.existsSync(reportPath) && fs.statSync(reportPath).size > 0;
  const presentationExists = fs.existsSync(presentationPath) && fs.statSync(presentationPath).size > 0;

  if (!sourceExists || !reportExists || !presentationExists) {
    const missing: string[] = [];
    if (!sourceExists) missing.push('smart-campus-attendance-source.zip');
    if (!reportExists) missing.push('smart-campus-attendance-report.pdf');
    if (!presentationExists) missing.push('smart-campus-attendance-presentation.pdf');

    console.error(`❌ Original evidence files missing: ${missing.join(', ')}`);
    throw new Error(`Original demo evidence files are missing: ${missing.join(', ')}. Restoration stopped.`);
  }

  const sourceCodeSize = `${(fs.statSync(sourceCodePath).size / 1024).toFixed(1)} KB`;
  const reportSize = `${(fs.statSync(reportPath).size / 1024).toFixed(1)} KB`;
  const presentationSize = `${(fs.statSync(presentationPath).size / 1024).toFixed(1)} KB`;

  console.log(`   ✅ Source code archive: smart-campus-attendance-source.zip (${sourceCodeSize})`);
  console.log(`   ✅ Project report PDF: smart-campus-attendance-report.pdf (${reportSize})`);
  console.log(`   ✅ Presentation PDF: smart-campus-attendance-presentation.pdf (${presentationSize})\n`);

  // ----------------------------------------------------
  // STEP 2: FIND EXISTING DEMO USER
  // ----------------------------------------------------
  console.log('2. Locating existing demo user (demo@provalix.ai / PRV-DEMO01)...');
  const demoUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: 'demo@provalix.ai' },
        { permanentId: 'PRV-DEMO01' },
      ],
    },
  });

  if (demoUsers.length === 0) {
    throw new Error('Existing demo user not found in database. Restoration aborted without creating new user.');
  }
  if (demoUsers.length > 1) {
    throw new Error(`Multiple demo users found (${demoUsers.length}). Database state ambiguous.`);
  }

  const demoUser = demoUsers[0];
  console.log(`   ✅ Existing demo user verified: ${demoUser.name} (${demoUser.email}, ID: ${demoUser.id}, PermID: ${demoUser.permanentId})\n`);

  // ----------------------------------------------------
  // STEP 3: CHECK EXISTING PROJECT / REUSE OR RESTORE
  // ----------------------------------------------------
  console.log('3. Checking Project Checker project existence...');
  const projectTitle = 'Smart Campus Attendance & Analytics System';
  let projectAction: 'REUSED' | 'RESTORED' = 'RESTORED';

  let project = await prisma.projectCheckerProject.findFirst({
    where: {
      userId: demoUser.id,
      title: projectTitle,
    },
    include: {
      resources: true,
      aiEvaluation: true,
      plagiarism: true,
    },
  });

  if (project) {
    projectAction = 'REUSED';
    console.log(`   ✅ Existing ProjectCheckerProject found: ${project.id} (Reusing)`);
  } else {
    // Check if an existing ID was used in public.projects or public.project_reports
    const existingPublicRows: any[] = await prisma.$queryRawUnsafe(
      'SELECT id FROM public.project_reports WHERE user_id = $1::uuid AND project_title = $2 LIMIT 1',
      demoUser.id,
      projectTitle
    );
    const existingId = existingPublicRows.length > 0 ? existingPublicRows[0].id : undefined;

    console.log(`   Restoring deleted project in Prisma${existingId ? ` with existing UUID: ${existingId}` : ''}...`);

    project = await prisma.projectCheckerProject.create({
      data: {
        ...(existingId ? { id: existingId } : {}),
        userId: demoUser.id,
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
        resources: {
          create: [
            {
              type: 'sourceCode',
              name: 'smart-campus-attendance-source.zip',
              path: sourceCodePath,
              url: '/api/storage/files/provalix-uploads/smart-campus-attendance-source.zip',
              size: sourceCodeSize,
            },
            {
              type: 'projectReport',
              name: 'smart-campus-attendance-report.pdf',
              path: reportPath,
              url: '/api/storage/files/provalix-uploads/smart-campus-attendance-report.pdf',
              size: reportSize,
            },
            {
              type: 'ppt',
              name: 'smart-campus-attendance-presentation.pdf',
              path: presentationPath,
              url: '/api/storage/files/provalix-uploads/smart-campus-attendance-presentation.pdf',
              size: presentationSize,
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

    console.log(`   ✅ Restored ProjectCheckerProject: ${project.id}\n`);
  }

  // ----------------------------------------------------
  // STEP 4: RUN REAL EVIDENCE-BASED AI EVALUATION OR RESTORE PREVIOUS GENUINE EVALUATION
  // ----------------------------------------------------
  console.log('4. Checking / Running Evidence-based AI Evaluation...');
  let evaluationScore: number | null = null;
  let aiModelName: string | undefined;
  let aiServiceStatus = 'ONLINE';

  if (project.aiEvaluation) {
    evaluationScore = project.aiEvaluation.totalScore;
    aiModelName = project.aiEvaluation.aiModel;
    console.log(`   ✅ Prisma evaluation record already present: ${evaluationScore}/100 (Model: ${aiModelName})`);
  } else {
    // Attempt live evaluation first
    console.log('   Triggering REAL AI evaluation via configured Gemini AI provider...');
    try {
      await projectCheckerService.runAIEvaluation(project.id, demoUser.id);
      const reloadedProject = await prisma.projectCheckerProject.findUnique({
        where: { id: project.id },
        include: { resources: true, aiEvaluation: true, plagiarism: true },
      });
      if (reloadedProject?.aiEvaluation) {
        project = reloadedProject;
        evaluationScore = project.aiEvaluation.totalScore;
        aiModelName = project.aiEvaluation.aiModel;
        console.log(`   ✅ Live AI Evaluation succeeded: ${evaluationScore}/100 (Model: ${aiModelName})`);
      }
    } catch (evalErr: any) {
      console.warn(`   ⚠️ Live AI Evaluation call failed: ${evalErr.message}`);
      aiServiceStatus = `Live Gemini Quota Exhausted: ${evalErr.message}`;

      // Check if the original genuine evaluation generated by Gemini 3.8 Flash is preserved in public.project_reports
      const preservedReports: any[] = await prisma.$queryRawUnsafe(
        'SELECT report_data FROM public.project_reports WHERE id = $1::uuid AND user_id = $2::uuid',
        project.id,
        demoUser.id
      );

      const preservedEval = preservedReports[0]?.report_data?.evaluation;
      const preservedPlag = preservedReports[0]?.report_data?.plagiarism;

      if (preservedEval && preservedEval.totalScore !== undefined && preservedEval.aiModel === 'gemini-3.8-flash') {
        console.log('   Restoring genuine preserved Gemini 3.8 Flash evaluation to Prisma tables...');
        const restoredEval = await prisma.projectCheckerAIEvaluation.upsert({
          where: { projectId: project.id },
          create: {
            projectId: project.id,
            problemDefinitionScore: preservedEval.problemDefinitionScore,
            problemDefinitionFeedback: preservedEval.problemDefinitionFeedback,
            innovationNoveltyScore: preservedEval.innovationNoveltyScore,
            innovationNoveltyFeedback: preservedEval.innovationNoveltyFeedback,
            technicalImplementationScore: preservedEval.technicalImplementationScore,
            technicalImplementationFeedback: preservedEval.technicalImplementationFeedback,
            functionalityScore: preservedEval.functionalityScore,
            functionalityFeedback: preservedEval.functionalityFeedback,
            codeQualityScore: preservedEval.codeQualityScore,
            codeQualityFeedback: preservedEval.codeQualityFeedback,
            documentationScore: preservedEval.documentationScore,
            documentationFeedback: preservedEval.documentationFeedback,
            overallQualityScore: preservedEval.overallQualityScore,
            overallQualityFeedback: preservedEval.overallQualityFeedback,
            totalScore: preservedEval.totalScore,
            strengths: typeof preservedEval.strengths === 'string' ? preservedEval.strengths : JSON.stringify(preservedEval.strengths),
            weaknesses: typeof preservedEval.weaknesses === 'string' ? preservedEval.weaknesses : JSON.stringify(preservedEval.weaknesses),
            technicalAnalysis: preservedEval.technicalAnalysis,
            codeAnalysis: preservedEval.codeAnalysis,
            documentationAnalysis: preservedEval.documentationAnalysis,
            actionableSuggestions: typeof preservedEval.actionableSuggestions === 'string' ? preservedEval.actionableSuggestions : JSON.stringify(preservedEval.actionableSuggestions),
            improvementPlan: typeof preservedEval.improvementPlan === 'string' ? preservedEval.improvementPlan : JSON.stringify(preservedEval.improvementPlan),
            summary: preservedEval.summary,
            aiModel: preservedEval.aiModel,
            isDemoData: false,
          },
          update: {
            totalScore: preservedEval.totalScore,
            aiModel: preservedEval.aiModel,
          },
        });

        if (preservedPlag) {
          await prisma.projectCheckerPlagiarism.upsert({
            where: { projectId: project.id },
            create: {
              projectId: project.id,
              codeSimilarity: preservedPlag.codeSimilarity ?? 0,
              reportSimilarity: preservedPlag.reportSimilarity ?? 0,
              overallSimilarity: preservedPlag.overallSimilarity ?? 0,
              status: preservedPlag.status ?? 'Low',
              deduction: preservedPlag.deduction ?? 0,
              reason: preservedPlag.reason,
              feedback: preservedPlag.feedback,
              matchedSources: typeof preservedPlag.matchedSources === 'string' ? preservedPlag.matchedSources : JSON.stringify(preservedPlag.matchedSources || []),
              isDemoData: false,
            },
            update: {
              overallSimilarity: preservedPlag.overallSimilarity ?? 0,
            },
          });
        }

        const reloaded = await prisma.projectCheckerProject.findUnique({
          where: { id: project.id },
          include: { resources: true, aiEvaluation: true, plagiarism: true },
        });
        if (reloaded) project = reloaded;

        evaluationScore = restoredEval.totalScore;
        aiModelName = restoredEval.aiModel;
        console.log(`   ✅ Genuine Gemini 3.8 Flash evaluation reconnected: ${evaluationScore}/100`);
      } else {
        console.error('   ❌ No preserved genuine evaluation found and live AI call failed.');
        throw new Error(`AI service failure and no genuine evaluation available: ${evalErr.message}`);
      }
    }
  }

  // ----------------------------------------------------
  // STEP 5: RESTORE & SYNC PROJECT REPORT
  // ----------------------------------------------------
  console.log('\n5. Restoring and syncing Project Report...');
  let reportAction: 'REUSED' | 'RESTORED' = 'RESTORED';

  const reportPayload = {
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
    plagiarism: project.plagiarism,
  };

  const currentScore = evaluationScore ?? 0;
  const currentSimilarity = project.plagiarism?.overallSimilarity ?? 0;

  // Sync to public.projects
  await prisma.$executeRaw`
    INSERT INTO public.projects (
      id, user_id, title, category, description, problem_statement, proposed_solution, objectives, innovation, features, target_users,
      technologies, programming_languages, testing_approach, limitations, future_enhancements, resources, ai_evaluation, plagiarism, status, created_at, updated_at
    ) VALUES (
      ${project.id}::uuid,
      ${demoUser.id}::uuid,
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
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      description = EXCLUDED.description,
      resources = EXCLUDED.resources,
      ai_evaluation = EXCLUDED.ai_evaluation,
      plagiarism = EXCLUDED.plagiarism,
      status = 'Evaluated',
      updated_at = NOW();
  `;

  // Sync to public.project_reports
  await prisma.$executeRaw`
    INSERT INTO public.project_reports (
      id, user_id, project_title, category, status, score, similarity, report_data, created_at, updated_at
    ) VALUES (
      ${project.id}::uuid,
      ${demoUser.id}::uuid,
      ${project.title},
      ${project.category},
      'Evaluated',
      ${currentScore},
      ${currentSimilarity},
      ${JSON.stringify(reportPayload)}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      project_title = EXCLUDED.project_title,
      category = EXCLUDED.category,
      score = ${currentScore},
      similarity = ${currentSimilarity},
      report_data = ${JSON.stringify(reportPayload)}::jsonb,
      status = 'Evaluated',
      updated_at = NOW();
  `;

  console.log(`   ✅ Project Report synced (ID: ${project.id})\n`);

  // ----------------------------------------------------
  // STEP 6: VERIFY DATABASE STATE & IDEMPOTENCY
  // ----------------------------------------------------
  console.log('6. Verifying database state & integrity...');
  const userCount = await prisma.user.count({
    where: { OR: [{ email: 'demo@provalix.ai' }, { permanentId: 'PRV-DEMO01' }] },
  });
  const projectCount = await prisma.projectCheckerProject.count({
    where: { userId: demoUser.id, title: projectTitle },
  });
  const publicReports: any[] = await prisma.$queryRawUnsafe(
    'SELECT id FROM public.project_reports WHERE user_id = $1::uuid',
    demoUser.id
  );
  const classroomCount = await prisma.classroom.count({
    where: { ownerId: demoUser.id },
  });
  const submissionCount = await prisma.submission.count({
    where: { submitterId: demoUser.id },
  });
  const teamCount = await prisma.team.count({
    where: { OR: [{ captainId: demoUser.id }, { createdById: demoUser.id }] },
  });

  console.log(`   - Demo User count: ${userCount} (Expected: 1)`);
  console.log(`   - Demo Project count: ${projectCount} (Expected: 1)`);
  console.log(`   - Demo Project Report count: ${publicReports.length} (Expected: 1)`);
  console.log(`   - Demo Classroom count: ${classroomCount} (Unchanged, Expected: 1)`);
  console.log(`   - Demo Classroom Submission count: ${submissionCount} (Unchanged, Expected: 1)`);
  console.log(`   - Demo Team count: ${teamCount} (Unchanged, Expected: 1)`);

  const duplicatesFound =
    userCount !== 1 ||
    projectCount !== 1 ||
    publicReports.length !== 1 ||
    classroomCount !== 1 ||
    submissionCount !== 1 ||
    teamCount !== 1;

  if (duplicatesFound) {
    console.warn('⚠️ Warning: Duplicate counts detected!');
  } else {
    console.log('   ✅ All record counts verified exactly 1. Zero duplicates.');
  }

  return {
    evidenceFound: true,
    projectAction,
    reportAction,
    projectId: project.id,
    reportId: project.id,
    evaluationScore,
    aiModel: aiModelName,
    aiServiceStatus,
    duplicatesFound,
  };
}

if (require.main === module) {
  restoreDemoProject()
    .then((res) => {
      console.log('\n====================================================');
      console.log('RESTORATION COMPLETED SUCCESSFULLY');
      console.log('====================================================');
      console.log(JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ RESTORATION FAILED:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

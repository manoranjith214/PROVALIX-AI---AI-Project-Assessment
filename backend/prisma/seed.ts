import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

async function seedSystemKnowledge() {
  const demoKnowledgePath = path.resolve(__dirname, '../src/datasets/demo-evaluation-knowledge.json');
  if (fs.existsSync(demoKnowledgePath)) {
    const rawDemoJson = JSON.parse(fs.readFileSync(demoKnowledgePath, 'utf-8'));
    for (const rec of rawDemoJson.records) {
      const existingDoc = await prisma.knowledgeDocument.findFirst({ where: { title: rec.title } });
      if (!existingDoc) {
        await prisma.knowledgeDocument.create({
          data: {
            title: rec.title,
            category: rec.category,
            content: rec.content,
            source: rec.source,
            chunks: {
              create: [
                {
                  chunkIndex: 0,
                  content: rec.content,
                  embedding: JSON.stringify(new Array(64).fill(0.125)),
                },
              ],
            },
          },
        });
      }
    }
    console.log(`✅ Reference Knowledge Documents ingested: ${rawDemoJson.records.length} documents.`);
  }
}

async function main() {
  const allowDemoSeed = process.env.ALLOW_DEMO_SEED === 'true';

  if (!allowDemoSeed) {
    console.log('🛡️ Demo seed disabled by default. Running reference knowledge initialization only...');
    await seedSystemKnowledge();
    console.log('✅ Safe idempotent initialization complete.');
    return;
  }

  console.log('🌱 Seeding Provalix AI demo data for local/dev testing...');

  // Safe demo password hashed with bcrypt
  const demoPasswordHash = await bcrypt.hash('DemoUser123!', 10);

  // 1. Create Demo Users (PRV IDs)
  const alex = await prisma.user.upsert({
    where: { email: 'alex.morgan@apex.edu' },
    update: {},
    create: {
      name: 'Alex Morgan [DEMO]',
      email: 'alex.morgan@apex.edu',
      passwordHash: demoPasswordHash,
      permanentId: 'PRV-10482',
      department: 'Computer Science & Engineering',
      year: '4th Year',
      college: 'Apex Institute of Technology & Research',
    },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah.chen@apex.edu' },
    update: {},
    create: {
      name: 'Sarah Chen [DEMO]',
      email: 'sarah.chen@apex.edu',
      passwordHash: demoPasswordHash,
      permanentId: 'PRV-20591',
      department: 'Computer Science & Engineering',
      year: '4th Year',
      college: 'Apex Institute of Technology & Research',
    },
  });

  const profSharma = await prisma.user.upsert({
    where: { email: 'dr.sharma@apex.edu' },
    update: {},
    create: {
      name: 'Dr. Ramesh Sharma [DEMO]',
      email: 'dr.sharma@apex.edu',
      passwordHash: demoPasswordHash,
      permanentId: 'PRV-99001',
      department: 'Computer Science & Engineering',
      year: 'Faculty Coordinator',
      college: 'Apex Institute of Technology & Research',
    },
  });

  const rahul = await prisma.user.upsert({
    where: { email: 'rahul.verma@apex.edu' },
    update: {},
    create: {
      name: 'Rahul Verma [DEMO]',
      email: 'rahul.verma@apex.edu',
      passwordHash: demoPasswordHash,
      permanentId: 'PRV-30485',
      department: 'Information Technology',
      year: '3rd Year',
      college: 'Apex Institute of Technology & Research',
    },
  });

  console.log('✅ Demo Users created:', alex.permanentId, sarah.permanentId, profSharma.permanentId, rahul.permanentId);

  // 2. Create Demo Reusable Team
  let team = await prisma.team.findFirst({ where: { name: 'Neural Pioneers [DEMO]' } });
  if (!team) {
    team = await prisma.team.create({
      data: {
        name: 'Neural Pioneers [DEMO]',
        code: 'TM-10492',
        maxSize: 4,
        captainId: alex.id,
        createdById: alex.id,
        members: {
          create: [
            { userId: alex.id, role: 'CAPTAIN' },
            { userId: sarah.id, role: 'MEMBER' },
          ],
        },
      },
    });
    console.log('✅ Demo Team created:', team.name, team.code);
  }

  // 3. Create Demo Classroom (Owner = Dr. Sharma)
  let classroom = await prisma.classroom.findFirst({ where: { code: 'CLS-82910' } });
  if (!classroom) {
    classroom = await prisma.classroom.create({
      data: {
        name: 'CapStone Project Evaluation 2026 [DEMO]',
        description: 'Automated evaluation milestone for Senior Engineering final submissions.',
        code: 'CLS-82910',
        ownerId: profSharma.id,
        startDate: new Date('2026-08-01'),
        deadline: new Date('2026-11-30'),
        submissionMode: 'Team',
        status: 'Active',
        resourcesConfig: JSON.stringify([
          { type: 'sourceCode', label: 'Source Code ZIP', required: true },
          { type: 'projectReport', label: 'Project Report PDF', required: true },
          { type: 'ppt', label: 'Presentation Deck PPTX', required: true },
        ]),
        members: {
          create: [
            { userId: profSharma.id, role: 'OWNER' },
            { userId: alex.id, role: 'MEMBER' },
            { userId: sarah.id, role: 'MEMBER' },
            { userId: rahul.id, role: 'MEMBER' },
          ],
        },
      },
    });
    console.log('✅ Demo Classroom created:', classroom.name, classroom.code);
  }

  // 4. Create Demo Submission
  let submission = await prisma.submission.findFirst({ where: { classroomId: classroom.id } });
  if (!submission) {
    submission = await prisma.submission.create({
      data: {
        classroomId: classroom.id,
        submitterId: alex.id,
        teamId: team.id,
        title: 'Autonomous Drone Navigation using Edge Vision [DEMO]',
        category: 'Artificial Intelligence & Robotics',
        description: 'Low-latency obstacle avoidance system running quantized vision transformers on embedded drone hardware.',
        problemStatement: 'Commercial GPS signals degrade heavily inside urban canyons and disaster zones.',
        proposedSolution: 'Edge-computed visual SLAM paired with real-time semantic segmentation.',
        objectives: 'Achieve sub-50ms inference on 15W edge SoC while maintaining 94% obstacle detection accuracy.',
        innovation: 'Novel hybrid depth estimation leveraging sparse optical flow and lightweight monocular frames.',
        features: 'Real-time 3D bounding boxes, collision risk scoring, automated return-to-home failover.',
        targetUsers: 'Search and rescue teams, industrial warehouse inspectors, autonomous aerial survey fleets.',
        technologies: JSON.stringify(['PyTorch', 'TensorRT', 'FastAPI', 'ROS2', 'React', 'Docker']),
        programmingLanguages: JSON.stringify(['Python', 'C++', 'TypeScript']),
        testingApproach: 'HIL simulation in AirSim followed by 50 live test flight trials.',
        limitations: 'Adverse weather conditions like heavy snowfall reduce optical sensor range.',
        futureEnhancements: 'Sensor fusion integrating millimeter-wave radar for zero-visibility scenarios.',
        githubUrl: 'https://github.com/provalix-demo/autonomous-drone-edge',
        liveDemoUrl: 'https://drone-edge-demo.apex.edu',
        status: 'Verified',
        finalTotalScore: 92.5, // AI: 44.5 + PPT/Demo: 23.0 + Viva: 25.0
        resources: {
          create: [
            { type: 'sourceCode', name: 'drone_firmware_v2.zip', size: '14.2 MB', status: 'uploaded' },
            { type: 'projectReport', name: 'Final_CapStone_Report_Alex_Sarah.pdf', size: '6.8 MB', status: 'uploaded' },
            { type: 'ppt', name: 'Presentation_Defense.pptx', size: '12.1 MB', status: 'uploaded' },
          ],
        },
      },
    });

    // Classroom AI Evaluation (Out of 50)
    await prisma.classroomAIEvaluation.create({
      data: {
        submissionId: submission.id,
        rawScore: 45.0,
        codeSimilarity: 5.2,
        reportSimilarity: 7.8,
        overallSimilarity: 6.5,
        deduction: 0.5,
        finalScore: 44.5,
        plagiarismStatus: 'Low',
        feedback: 'Outstanding technical rigor with clean modular ROS2 node structure. Plagiarism check passed.',
        improvementPlan: JSON.stringify([
          { area: 'Benchmarking', suggestion: 'Document frame jitter metrics during thermal throttling.', priority: 'Medium' },
        ]),
        isDemoData: true,
      },
    });

    // Faculty Evaluation (Out of 50: PPT/Demo 25 + Viva 25)
    await prisma.facultyEvaluation.create({
      data: {
        submissionId: submission.id,
        evaluatorId: profSharma.id,
        pptDemoScore: 23.0,
        vivaTotalScore: 25.0,
        totalFacultyScore: 48.0,
        status: 'Completed',
        feedback: 'Superb project defense. The live flight teleoperation demo clearly demonstrated failover handling.',
        vivaResponses: {
          create: [
            { questionNumber: 1, questionText: 'Architecture & Scalability', maxScore: 5, score: 5, feedback: 'Thorough knowledge of ROS2 middleware' },
            { questionNumber: 2, questionText: 'Core Problem & Novelty', maxScore: 5, score: 5, feedback: 'Strong differentiation against commercial DJI SDK' },
            { questionNumber: 3, questionText: 'Security & Error Handling', maxScore: 5, score: 5, feedback: 'Failover safe states well defined' },
            { questionNumber: 4, questionText: 'Data Modeling & Integrity', maxScore: 5, score: 5, feedback: 'Clean telemetry telemetry serialization' },
            { questionNumber: 5, questionText: 'Testing & Future Scope', maxScore: 5, score: 5, feedback: 'Rigorous 50-flight real-world log evaluation' },
          ],
        },
      },
    });

    // Verification by Owner
    await prisma.verification.create({
      data: {
        submissionId: submission.id,
        verifiedById: profSharma.id,
        status: 'Approved',
        feedback: 'Score verified and finalized for department rankings.',
      },
    });

    console.log('✅ Demo Submission & Evaluation created with final score:', submission.finalTotalScore);
  }

  // 5. Create Standalone Project Checker Project (Out of 100)
  let projChecker = await prisma.projectCheckerProject.findFirst({ where: { userId: rahul.id } });
  if (!projChecker) {
    projChecker = await prisma.projectCheckerProject.create({
      data: {
        userId: rahul.id,
        title: 'Smart Health Vital Tracker using Edge ML [DEMO]',
        category: 'Internet of Things & Healthcare',
        description: 'Wearable arrhythmia detection device processing raw PPG sensor signals with quantized neural networks.',
        problemStatement: 'Cloud-dependent cardiac monitors suffer from latency and severe patient privacy risks.',
        proposedSolution: 'On-device tinyML model identifying irregular rhythms within 200 milliseconds.',
        objectives: '98% sensitivity for AFib detection while maintaining 5-day battery endurance on a single charge.',
        innovation: 'Integer-only quantized CNN running on ultra-low-power ARM Cortex-M4 microcontroller.',
        features: 'Continuous arrhythmia screening, emergency BLE beacon dispatch, encrypted on-flash storage.',
        targetUsers: 'Cardiovascular patients, ambulatory monitoring clinics, elderly care facilities.',
        technologies: JSON.stringify(['TensorFlow Lite for Microcontrollers', 'C', 'FreeRTOS', 'Flutter']),
        programmingLanguages: JSON.stringify(['C', 'Dart', 'Python']),
        testingApproach: 'MIT-BIH Arrhythmia benchmark dataset testing + benchtop hardware pulse simulator validation.',
        limitations: 'Severe physical motion artifacts require adaptive noise cancellation filtering.',
        futureEnhancements: 'Integration with optical blood pressure estimation algorithms.',
        githubUrl: 'https://github.com/provalix-demo/tinyml-cardiac-monitor',
        liveDemoUrl: 'https://tinyml-cardiac.apex.edu',
      },
    });

    // Plagiarism record
    await prisma.projectCheckerPlagiarism.create({
      data: {
        projectId: projChecker.id,
        codeSimilarity: 6.8,
        reportSimilarity: 8.2,
        overallSimilarity: 7.5,
        status: 'Low',
        deduction: 0,
        feedback: 'Plagiarism check passed. Academic integrity verified.',
        isDemoData: true,
      },
    });

    // Standalone 100-mark evaluation with exact 7 criteria
    await prisma.projectCheckerAIEvaluation.create({
      data: {
        projectId: projChecker.id,
        problemDefinitionScore: 14.5,
        problemDefinitionFeedback: 'Clinical need and patient risk factors comprehensively documented.',
        innovationNoveltyScore: 19.0,
        innovationNoveltyFeedback: 'Quantized tinyML inference on Cortex-M4 represents solid innovation.',
        technicalImplementationScore: 19.0,
        technicalImplementationFeedback: 'Clean FreeRTOS task scheduling with interrupt-driven sampling.',
        functionalityScore: 14.0,
        functionalityFeedback: 'AFib classification verified on simulator bench.',
        codeQualityScore: 9.0,
        codeQualityFeedback: 'Well-structured embedded C code adhering to MISRA guidelines.',
        documentationScore: 9.5,
        documentationFeedback: 'Exemplary circuit schematics and firmware build instructions.',
        overallQualityScore: 9.5,
        overallQualityFeedback: 'High potential for translational biomedical engineering.',
        totalScore: 94.5,
        strengths: JSON.stringify([
          'Exceptional power-efficient tinyML architecture',
          'Clinical dataset benchmark verification included',
          'Clean embedded firmware structure with FreeRTOS',
        ]),
        weaknesses: JSON.stringify([
          'Need patient trial documentation to assess motion artifact handling',
          'Battery power consumption measurements should be verified with power analyzer',
        ]),
        technicalAnalysis: 'The design demonstrates disciplined embedded systems programming. Memory footprint is well optimized.',
        codeAnalysis: 'Strict buffer boundary checks and non-blocking ISR routines ensure real-time reliability.',
        documentationAnalysis: 'Schematics, bill of materials, and validation logs are thoroughly organized.',
        improvementPlan: JSON.stringify([
          { area: 'Benchtop Power Profiling', suggestion: 'Capture oscilloscope power traces during BLE transmission.', priority: 'High' },
          { area: 'Motion Rejection', suggestion: 'Incorporate 3-axis accelerometer noise cancellation filter.', priority: 'Medium' },
        ]),
        summary: 'Outstanding biomedical IoT engineering project scoring 94.5/100.',
        isDemoData: true,
      },
    });

    console.log('✅ Demo Standalone Project Checker project created with score: 94.5/100');
  }

  // 6. Create Demo Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: 'result_published',
        title: 'Project Evaluation Verified',
        message: 'Your final score for "Autonomous Drone Navigation" is 92.5/100. Ranked #1.',
        link: `/classrooms/${classroom.id}`,
        read: false,
      },
      {
        userId: rahul.id,
        type: 'ai_evaluated',
        title: 'Project Checker Evaluation Complete',
        message: 'Your project "Smart Health Vital Tracker" scored 94.5/100.',
        link: `/project-checker/${projChecker.id}`,
        read: false,
      },
    ],
  });

  // 7. Seed DEMO KNOWLEDGE DATA into KnowledgeDocument and KnowledgeChunk
  const demoKnowledgePath = path.resolve(__dirname, '../src/datasets/demo-evaluation-knowledge.json');
  if (fs.existsSync(demoKnowledgePath)) {
    const rawDemoJson = JSON.parse(fs.readFileSync(demoKnowledgePath, 'utf-8'));
    for (const rec of rawDemoJson.records) {
      const existingDoc = await prisma.knowledgeDocument.findFirst({ where: { title: rec.title } });
      if (!existingDoc) {
        await prisma.knowledgeDocument.create({
          data: {
            title: rec.title,
            category: rec.category,
            content: rec.content,
            source: rec.source,
            chunks: {
              create: [
                {
                  chunkIndex: 0,
                  content: rec.content,
                  embedding: JSON.stringify(new Array(64).fill(0.125)),
                },
              ],
            },
          },
        });
      }
    }
    console.log(`✅ DEMO KNOWLEDGE DATA ingested: ${rawDemoJson.records.length} documents.`);
  }

  // 8. Seed Sample Chatbot Conversation
  const sampleConv = await prisma.chatConversation.create({
    data: {
      userId: alex.id,
      title: 'Drone Navigation Architecture Discussion',
      submissionId: submission.id,
      messages: {
        create: [
          {
            role: 'user',
            message: 'How was my Technical Implementation scored in the CapStone evaluation?',
          },
          {
            role: 'assistant',
            message: 'Your project "Autonomous Drone Navigation using Edge Vision" scored 44.5/50 in the AI component with high marks for modular ROS2 node structure. Faculty defense contributed 23.0/25 in PPT/Demo and 25/25 in Viva.',
            sources: JSON.stringify([
              { title: 'Classroom Submission: Autonomous Drone Navigation using Edge Vision [DEMO]', category: 'Classroom Evaluation' },
              { title: 'Technical Implementation & Architecture Guidelines', category: 'Technical Implementation Guidelines' },
            ]),
          },
        ],
      },
    },
  });
  console.log('✅ Demo Chatbot Conversation created:', sampleConv.id);

  console.log('🌱 Provalix AI demo seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

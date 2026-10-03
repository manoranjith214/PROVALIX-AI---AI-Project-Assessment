import { app } from '../src/app';
import request from 'supertest';
import { prisma } from '../src/config/prisma';

describe('Stage 4: Complete End-to-End Functional & Data Integrity Audit', () => {
  jest.setTimeout(60000);

  const timestamp = Date.now();
  const userA_cred = {
    email: `owner_a_${timestamp}@provalix.test`,
    password: 'Password123!',
    name: 'Alice Owner',
    permanentId: `PRV-A${timestamp.toString().slice(-4)}`,
  };

  const userB_cred = {
    email: `student_b_${timestamp}@provalix.test`,
    password: 'Password123!',
    name: 'Bob Member',
    permanentId: `PRV-B${timestamp.toString().slice(-4)}`,
  };

  const userC_cred = {
    email: `evaluator_c_${timestamp}@provalix.test`,
    password: 'Password123!',
    name: 'Carol Evaluator',
    permanentId: `PRV-C${timestamp.toString().slice(-4)}`,
  };

  let tokenA: string;
  let userA_id: string;
  let tokenB: string;
  let userB_id: string;
  let tokenC: string;
  let userC_id: string;

  let classroomId: string;
  let classroomCode: string;
  let teamClassroomId: string;
  let teamClassroomCode: string;
  let teamId: string;
  let teamCode: string;
  let standaloneProjectId: string;
  let submissionId: string;

  beforeAll(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  });

  afterAll(async () => {
    try {
      if (submissionId) {
        await prisma.submission.delete({ where: { id: submissionId } }).catch(() => {});
      }
      if (classroomId) {
        await prisma.classroom.delete({ where: { id: classroomId } }).catch(() => {});
      }
      if (teamClassroomId) {
        await prisma.classroom.delete({ where: { id: teamClassroomId } }).catch(() => {});
      }
      if (teamId) {
        await prisma.team.delete({ where: { id: teamId } }).catch(() => {});
      }
      if (standaloneProjectId) {
        await prisma.projectCheckerProject.delete({ where: { id: standaloneProjectId } }).catch(() => {});
      }
      if (userA_id) {
        await prisma.user.delete({ where: { id: userA_id } }).catch(() => {});
      }
      if (userB_id) {
        await prisma.user.delete({ where: { id: userB_id } }).catch(() => {});
      }
      if (userC_id) {
        await prisma.user.delete({ where: { id: userC_id } }).catch(() => {});
      }
    } catch {}
  });

  describe('1. Authentication, Identity & Multi-User Isolation', () => {
    it('Registers User A, User B, and User C with distinct permanent User IDs', async () => {
      const resA = await request(app).post('/api/auth/register').send(userA_cred);
      expect(resA.status).toBe(201);
      expect(resA.body.success).toBe(true);
      tokenA = resA.body.data.accessToken;
      userA_id = resA.body.data.user.id;
      expect(userA_id).toBeDefined();

      const resB = await request(app).post('/api/auth/register').send(userB_cred);
      expect(resB.status).toBe(201);
      expect(resB.body.success).toBe(true);
      tokenB = resB.body.data.accessToken;
      userB_id = resB.body.data.user.id;
      expect(userB_id).toBeDefined();

      const resC = await request(app).post('/api/auth/register').send(userC_cred);
      expect(resC.status).toBe(201);
      expect(resC.body.success).toBe(true);
      tokenC = resC.body.data.accessToken;
      userC_id = resC.body.data.user.id;
      expect(userC_id).toBeDefined();

      expect(userA_id).not.toEqual(userB_id);
      expect(userB_id).not.toEqual(userC_id);
      expect(userA_id).not.toEqual(userC_id);
    });

    it('Logs in User A and verifies /api/auth/me returns User A credentials', async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: userA_cred.email,
        password: userA_cred.password,
      });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.user.id).toBe(userA_id);

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.data.id).toBe(userA_id);
      expect(meRes.body.data.email).toBe(userA_cred.email.toLowerCase());
    });
  });

  describe('2. Classroom Create & Join P0 Flow', () => {
    it('User A creates an Individual classroom, receiving valid DB ID and unique join code', async () => {
      const res = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: `AI Capstone ${timestamp}`,
          description: 'Autonomous Systems & Deep Learning Platform',
          startDate: '2026-03-01',
          deadline: '2027-06-30', // Future deadline
          submissionMode: 'Individual',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('code');
      expect(res.body.data.ownerId).toBe(userA_id);
      expect(res.body.data.submissionMode).toBe('Individual');

      classroomId = res.body.data.id;
      classroomCode = res.body.data.code;
      expect(classroomCode).toMatch(/^CLS-[A-Z0-9]+$/);
    });

    it('User B verifies join code before joining', async () => {
      const res = await request(app)
        .post('/api/classrooms/verify-code')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ code: classroomCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(classroomId);
      expect(res.body.data.code).toBe(classroomCode);
      expect(res.body.data.name).toBe(`AI Capstone ${timestamp}`);
    });

    it('User B joins the classroom using the join code (creates membership with Pending Approval)', async () => {
      const res = await request(app)
        .post('/api/classrooms/join-code')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ code: classroomCode });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.classroomId).toBe(classroomId);
      expect(res.body.data.status).toBe('Pending Approval');

      const memberInDb = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: {
            classroomId,
            userId: userB_id,
          },
        },
      });
      expect(memberInDb).not.toBeNull();
      expect(memberInDb?.status).toBe('Pending Approval');
      expect(memberInDb?.role).toBe('MEMBER');
    });

    it('User B attempting to re-join returns idempotent status without duplicate membership', async () => {
      const res = await request(app)
        .post('/api/classrooms/join-code')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ code: classroomCode });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('Pending Approval');
      expect(res.body.data.classroomId).toBe(classroomId);
    });

    it('User A approves User B membership', async () => {
      const res = await request(app)
        .put(`/api/classrooms/${classroomId}/members/${userB_id}/approve`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const memberInDb = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: {
            classroomId,
            userId: userB_id,
          },
        },
      });
      expect(memberInDb?.status).toBe('Approved');
    });

    it('User B can now access classroom details with currentUserRole: MEMBER', async () => {
      const res = await request(app)
        .get(`/api/classrooms/${classroomId}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(classroomId);
      expect(res.body.data.currentUserRole).toBe('MEMBER');
      expect(res.body.data.currentUserStatus).toBe('Approved');
    });

    it('User A assigns User C as Evaluator and User C receives EVALUATOR role', async () => {
      const assignRes = await request(app)
        .post(`/api/classrooms/${classroomId}/evaluators`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ evaluatorId: userC_id });

      expect(assignRes.status).toBe(201);
      expect(assignRes.body.success).toBe(true);

      const clsRes = await request(app)
        .get(`/api/classrooms/${classroomId}`)
        .set('Authorization', `Bearer ${tokenC}`);

      expect(clsRes.status).toBe(200);
      expect(clsRes.body.data.currentUserRole).toBe('EVALUATOR');
    });

    it('Enforces contextual permissions: User B (MEMBER) cannot approve members or delete classroom', async () => {
      const approveRes = await request(app)
        .put(`/api/classrooms/${classroomId}/members/${userC_id}/approve`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(approveRes.status).toBe(403);

      const deleteRes = await request(app)
        .delete(`/api/classrooms/${classroomId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(deleteRes.status).toBe(403);
    });
  });

  describe('3. Team Lifecycle & Classroom Team Participation', () => {
    it('User A creates a Team and invites User B', async () => {
      const res = await request(app)
        .post('/api/teams')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: `Alpha Squad ${timestamp}`,
          maxSize: 4,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      teamId = res.body.data.id;
      teamCode = res.body.data.code;
      expect(teamId).toBeDefined();

      const invRes = await request(app)
        .post(`/api/teams/${teamId}/invites`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ userId: userB_id });

      expect(invRes.status).toBe(201);
      expect(invRes.body.success).toBe(true);
    });

    it('User B accepts the team invitation and joins the team', async () => {
      const inv = await prisma.teamInvitation.findFirst({
        where: { teamId, userId: userB_id },
      });
      expect(inv).not.toBeNull();

      const acceptRes = await request(app)
        .post(`/api/teams/invites/${inv!.id}/accept`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.success).toBe(true);

      const teamInDb = await prisma.team.findUnique({
        where: { id: teamId },
        include: { members: true },
      });
      expect(teamInDb?.members.length).toBe(2);
    });

    it('User A creates Team-mode classroom and requests team participation', async () => {
      const clsRes = await request(app)
        .post('/api/classrooms')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          name: `Robotics Team Championship ${timestamp}`,
          description: 'Team-based robotics capstone platform',
          startDate: '2026-03-01',
          deadline: '2027-07-31', // Future deadline
          submissionMode: 'Team',
          minTeamSize: 2,
          maxTeamSize: 4,
        });

      expect(clsRes.status).toBe(201);
      teamClassroomId = clsRes.body.data.id;
      teamClassroomCode = clsRes.body.data.code;

      const reqRes = await request(app)
        .post(`/api/teams/${teamId}/classrooms/request`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          classroomId: teamClassroomId,
        });

      expect(reqRes.status).toBe(201);
      expect(reqRes.body.success).toBe(true);

      const part = await prisma.classroomTeamParticipation.findUnique({
        where: {
          classroomId_teamId: {
            classroomId: teamClassroomId,
            teamId,
          },
        },
      });
      expect(part).not.toBeNull();
    });
  });

  describe('4. Standalone Project Checker & PDF Report', () => {
    it('User B creates a standalone project via Project Checker', async () => {
      const res = await request(app)
        .post('/api/project-checker/projects')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          title: `Autonomous Drone Pathfinding ${timestamp}`,
          category: 'Robotics & AI',
          targetUsers: 'Search and rescue teams and subterranean inspectors',
          description: 'Autonomous multi-rotor navigation architecture using graph neural networks in GPS-denied environments.',
          problemStatement: 'Severe loss of satellite telemetry in collapsed subterranean corridors and tunnels.',
          proposedSolution: 'Onboard visual-inertial odometry paired with distributed local graph SLAM algorithms.',
          technologies: ['ROS2', 'PyTorch', 'C++'],
          programmingLanguages: ['Python', 'C++'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      standaloneProjectId = res.body.data.id;
      expect(standaloneProjectId).toBeDefined();

      // Seed completed AI evaluation to enable PDF export
      await prisma.projectCheckerAIEvaluation.create({
        data: {
          projectId: standaloneProjectId,
          problemDefinitionScore: 14,
          problemDefinitionFeedback: 'Clear problem statement',
          innovationNoveltyScore: 18,
          innovationNoveltyFeedback: 'Strong innovation',
          technicalImplementationScore: 18,
          technicalImplementationFeedback: 'Solid implementation',
          functionalityScore: 14,
          functionalityFeedback: 'Fully functional pipeline',
          codeQualityScore: 9,
          codeQualityFeedback: 'Modular code',
          documentationScore: 9,
          documentationFeedback: 'Well documented',
          overallQualityScore: 9,
          overallQualityFeedback: 'High overall quality',
          totalScore: 91,
          strengths: JSON.stringify(['Robust architecture', 'High novelty']),
          weaknesses: JSON.stringify(['Add more automated unit tests']),
          technicalAnalysis: 'Clean modular pipeline using state of the art deep learning.',
          codeAnalysis: 'Strict linting and type safety followed.',
          documentationAnalysis: 'Comprehensive technical specifications.',
          actionableSuggestions: JSON.stringify(['Deploy to hardware']),
          improvementPlan: JSON.stringify([{ area: 'Testing', priority: 'High', suggestion: 'Increase test coverage' }]),
          summary: 'High quality engineering project.',
        },
      });
    });

    it('User B retrieves standalone project report PDF with real application/pdf content type', async () => {
      const res = await request(app)
        .get(`/api/project-checker/projects/${standaloneProjectId}/report/pdf`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toContain('.pdf');
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(500);
    });

    it('Also supports the alias endpoint GET /api/projects/:id/report/pdf', async () => {
      const res = await request(app)
        .get(`/api/projects/${standaloneProjectId}/report/pdf`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.body).toBeInstanceOf(Buffer);
    });
  });

  describe('5. Classroom Submissions, Faculty Evaluation, Verification & Leaderboard', () => {
    it('User B submits project to classroom', async () => {
      const res = await request(app)
        .post(`/api/classrooms/${classroomId}/submissions`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({
          title: `Edge Vision AI ${timestamp}`,
          category: 'Robotics & AI',
          description: 'Comprehensive edge neural pipeline for subterranean exploration rover navigation.',
          problemStatement: 'Extreme latency bottlenecks during continuous real-time point-cloud processing.',
          proposedSolution: 'Pruned lightweight depth-estimation transformers executing directly on embedded accelerators.',
          programmingLanguages: ['Python', 'TypeScript'],
          technologies: ['TensorFlow', 'FastAPI'],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      submissionId = res.body.data.id;
      expect(submissionId).toBeDefined();
    });

    it('User C (Evaluator) evaluates submission via faculty evaluation', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/faculty-evaluation`)
        .set('Authorization', `Bearer ${tokenC}`)
        .send({
          pptDemoScore: 18,
          vivaQuestions: [
            { questionNumber: 1, questionText: 'Explain model architecture', score: 5, feedback: 'Excellent' },
            { questionNumber: 2, questionText: 'Discuss latency benchmarks', score: 4, feedback: 'Good' },
            { questionNumber: 3, questionText: 'Review quantization methods', score: 4, feedback: 'Very good' },
            { questionNumber: 4, questionText: 'Explain memory constraints', score: 4, feedback: 'Well articulated' },
            { questionNumber: 5, questionText: 'Future deployment scope', score: 4, feedback: 'Thoughtful answer' },
          ],
          status: 'Completed',
          reason: 'Solid presentation',
          feedback: 'High practical value and well engineered pipeline.',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      const evalData = res.body.data.evaluation || res.body.data.facultyEvaluation;
      expect(evalData).toBeDefined();
      expect(evalData.pptDemoScore).toBe(18);
    });

    it('User A (Classroom Owner) verifies and publishes the submission', async () => {
      const res = await request(app)
        .post(`/api/submissions/${submissionId}/verify`)
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const subInDb = await prisma.submission.findUnique({
        where: { id: submissionId },
      });
      expect(subInDb?.status).toBe('Verified');
    });

    it('Leaderboard displays verified submission with proper rank and privacy isolation', async () => {
      const res = await request(app)
        .get(`/api/classrooms/${classroomId}/leaderboard`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('leaderboard');
      expect(Array.isArray(res.body.data.leaderboard)).toBe(true);

      const myEntry = res.body.data.leaderboard.find((entry: any) => entry.submissionId === submissionId);
      expect(myEntry).toBeDefined();
      expect(myEntry.rank).toBe(1);
      expect(myEntry.isOwnSubmission).toBe(true);
      expect(myEntry.detailedEvaluation).toBeDefined();
    });
  });
});

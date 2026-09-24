import { app } from '../src/app';
import request from 'supertest';
import { prisma } from '../src/config/prisma';

describe('LIVE END-TO-END MULTI-USER DATA ISOLATION VERIFICATION', () => {
  jest.setTimeout(45000);

  beforeAll(async () => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        break;
      } catch (err) {
        if (attempt === 3) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  });
  const stamp = Date.now();
  const userA_cred = {
    email: `student_alpha_${stamp}@provalix.test`,
    password: 'Password123!',
    name: 'Alice Alpha',
    permanentId: `ALPH${stamp.toString().slice(-4)}`,
  };

  const userB_cred = {
    email: `student_beta_${stamp}@provalix.test`,
    password: 'Password123!',
    name: 'Bob Beta',
    permanentId: `BETA${stamp.toString().slice(-4)}`,
  };

  let tokenA: string;
  let userA_id: string;
  let tokenB: string;
  let userB_id: string;

  let teamA_id: string;
  let projectA_id: string;

  it('1. User A registers fresh - starts with ZERO data', async () => {
    const regRes = await request(app).post('/api/auth/register').send(userA_cred);
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    tokenA = regRes.body.data.accessToken;
    userA_id = regRes.body.data.user.id;
    expect(tokenA).toBeDefined();

    // Verify User A has 0 projects
    const projRes = await request(app)
      .get('/api/project-checker/projects')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(projRes.status).toBe(200);
    expect(projRes.body.data).toEqual([]);

    // Verify User A has 0 teams
    const teamRes = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(teamRes.status).toBe(200);
    expect(teamRes.body.data).toEqual([]);

    // Verify User A has 0 classrooms
    const classRes = await request(app)
      .get('/api/classrooms')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(classRes.status).toBe(200);
    expect(classRes.body.data).toEqual([]);

    // Verify User A has 0 notifications
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data).toEqual([]);

    // Verify User A dashboard current-evaluations is empty
    const dashRes = await request(app)
      .get('/api/dashboard/current-evaluations')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data).toEqual([]);
  });

  it('2. User B registers fresh - starts with ZERO data', async () => {
    const regRes = await request(app).post('/api/auth/register').send(userB_cred);
    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    tokenB = regRes.body.data.accessToken;
    userB_id = regRes.body.data.user.id;
    expect(tokenB).toBeDefined();

    // Verify User B has 0 projects
    const projRes = await request(app)
      .get('/api/project-checker/projects')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(projRes.status).toBe(200);
    expect(projRes.body.data).toEqual([]);

    // Verify User B has 0 teams
    const teamRes = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(teamRes.status).toBe(200);
    expect(teamRes.body.data).toEqual([]);
  });

  it('3. User A creates a team and a project', async () => {
    // User A creates Team
    const createTeamRes = await request(app)
      .post('/api/teams')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Alpha Squad Pro', maxSize: 4 });
    expect(createTeamRes.status).toBe(201);
    teamA_id = createTeamRes.body.data.id;
    expect(teamA_id).toBeDefined();

    // User A creates Project
    const createProjRes = await request(app)
      .post('/api/project-checker/projects')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        title: 'Alpha Autonomous Drone Detection',
        description: 'Computer vision drone detection model',
        submissionMode: 'individual',
      });
    expect(createProjRes.status).toBe(201);
    projectA_id = createProjRes.body.data.id;
    expect(projectA_id).toBeDefined();

    // Verify User A now has 1 team and 1 project
    const myTeams = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(myTeams.body.data.length).toBe(1);
    expect(myTeams.body.data[0].id).toBe(teamA_id);

    const myProjects = await request(app)
      .get('/api/project-checker/projects')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(myProjects.body.data.length).toBe(1);
    expect(myProjects.body.data[0].id).toBe(projectA_id);
  });

  it('4. STRICT PRIVACY GUARD: User B CANNOT see User A team or project', async () => {
    // User B lists teams: MUST BE 0 (User A team must NOT leak)
    const userBTeams = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(userBTeams.status).toBe(200);
    expect(userBTeams.body.data).toEqual([]);

    // User B lists projects: MUST BE 0 (User A project must NOT leak)
    const userBProjects = await request(app)
      .get('/api/project-checker/projects')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(userBProjects.status).toBe(200);
    expect(userBProjects.body.data).toEqual([]);

    // User B tries to directly access User A project by ID -> MUST return 403 or 404
    const forbiddenProject = await request(app)
      .get(`/api/project-checker/projects/${projectA_id}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404]).toContain(forbiddenProject.status);

    // User B dashboard current evaluations -> MUST BE 0
    const userBDash = await request(app)
      .get('/api/dashboard/current-evaluations')
      .set('Authorization', `Bearer ${tokenB}`);
    expect(userBDash.status).toBe(200);
    expect(userBDash.body.data).toEqual([]);
  });

  it('5. User A re-login preserves own data, unchanged', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: userA_cred.email,
      password: userA_cred.password,
    });
    expect(loginRes.status).toBe(200);
    const reTokenA = loginRes.body.data.accessToken;

    const myProjects = await request(app)
      .get('/api/project-checker/projects')
      .set('Authorization', `Bearer ${reTokenA}`);
    expect(myProjects.body.data.length).toBe(1);
    expect(myProjects.body.data[0].title).toBe('Alpha Autonomous Drone Detection');

    const myTeams = await request(app)
      .get('/api/teams')
      .set('Authorization', `Bearer ${reTokenA}`);
    expect(myTeams.body.data.length).toBe(1);
    expect(myTeams.body.data[0].name).toBe('Alpha Squad Pro');
  });
});

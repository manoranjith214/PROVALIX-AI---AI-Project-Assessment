import request from 'supertest';
import app from '../src/app';
import { teamRepository } from '../src/repositories/teamRepository';
import { signAccessToken } from '../src/utils/token';

describe('TEAM DELETE END-TO-END VERIFICATION (CASES A - G)', () => {
  const captainUser = {
    id: 'usr-captain-uuid-1',
    permanentId: 'PRV-11111',
    email: 'captain@provalix.test',
    name: 'Captain Jack',
  };

  const nonCaptainUser = {
    id: 'usr-member-uuid-2',
    permanentId: 'PRV-22222',
    email: 'member@provalix.test',
    name: 'Crew Member',
  };

  const captainToken = signAccessToken(captainUser);
  const nonCaptainToken = signAccessToken(nonCaptainUser);

  const mockBaseTeam = {
    id: 'team-uuid-1234',
    name: 'Code Ninjas',
    code: 'TM-NINJA',
    captainId: captainUser.id,
    createdById: captainUser.id,
    maxSize: 4,
    status: 'Active',
    captain: {
      id: captainUser.id,
      name: captainUser.name,
      email: captainUser.email,
      permanentId: captainUser.permanentId,
    },
    members: [
      { userId: captainUser.id, role: 'CAPTAIN' },
      { userId: nonCaptainUser.id, role: 'MEMBER' },
    ],
    invitations: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test Case A: Existing team + no submissions → DELETE succeeds (200)
  test('Test Case A: Existing team + no submissions → DELETE succeeds (200)', async () => {
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockBaseTeam as any);
    jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(0);
    jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([]);
    jest.spyOn(teamRepository, 'delete').mockResolvedValue({ success: true } as any);

    const res = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Team deleted successfully');
    expect(teamRepository.delete).toHaveBeenCalledWith(mockBaseTeam.id);
  });

  // Test Case A2: Existing team from Supabase "teams" table + no submissions → DELETE succeeds (200)
  test('Test Case A2: Team stored in Supabase "teams" table with creator matching → DELETE succeeds (200)', async () => {
    const supabaseTeam = {
      ...mockBaseTeam,
      id: '72190411-c8bf-4a6a-9fbd-987ce1fa34a2',
      _fromSupabaseTable: true,
    };

    jest.spyOn(teamRepository, 'findById').mockResolvedValue(supabaseTeam as any);
    jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(0);
    jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([]);
    jest.spyOn(teamRepository, 'delete').mockResolvedValue({ success: true } as any);

    const res = await request(app)
      .delete(`/api/teams/${supabaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Team deleted successfully');
    expect(teamRepository.delete).toHaveBeenCalledWith(supabaseTeam.id);
  });

  // Test Case B: Existing team + submitted project → DELETE blocked with 409
  test('Test Case B: Existing team + submitted project → DELETE blocked with 409', async () => {
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockBaseTeam as any);
    jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(1); // 1 submission exists
    const deleteSpy = jest.spyOn(teamRepository, 'delete');

    const res = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot permanently delete team with existing submissions');
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // Test Case C: Existing team + classroom evaluation / approved records → DELETE blocked with 409
  test('Test Case C: Existing team + approved classroom evaluation record → DELETE blocked with 409', async () => {
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockBaseTeam as any);
    jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(0);
    jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([
      { id: 'part-1', classroomId: 'cls-1', teamId: mockBaseTeam.id, status: 'Approved' } as any,
    ]);
    const deleteSpy = jest.spyOn(teamRepository, 'delete');

    const res = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Cannot permanently delete team with approved classroom records');
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // Test Case D: Non-existing team ID → 404
  test('Test Case D: Non-existing team ID → 404 Not Found', async () => {
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/teams/non-existent-team-uuid')
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Team not found');
  });

  // Test Case E: Authenticated user without permission → 403
  test('Test Case E: Authenticated user without permission (non-captain) → 403 Forbidden', async () => {
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockBaseTeam as any);
    const deleteSpy = jest.spyOn(teamRepository, 'delete');

    const res = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${nonCaptainToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Only the team captain can delete the team');
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  // Test Case F: Missing/expired authentication → 401
  test('Test Case F: Missing/expired authentication → 401 Unauthorized', async () => {
    // No Authorization header
    const resNoAuth = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`);

    expect(resNoAuth.status).toBe(401);
    expect(resNoAuth.body.success).toBe(false);
    expect(resNoAuth.body.message).toContain('Authentication required');

    // Invalid token
    const resBadToken = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(resBadToken.status).toBe(401);
    expect(resBadToken.body.success).toBe(false);
  });

  // Test Case G: Double-click/delete already deleted team → clean 404 handling
  test('Test Case G: Double-click/delete already deleted team → clean 404 handling', async () => {
    let teamExists = true;

    jest.spyOn(teamRepository, 'findById').mockImplementation(async (id: string) => {
      if (!teamExists) return null;
      return mockBaseTeam as any;
    });
    jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(0);
    jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([]);
    jest.spyOn(teamRepository, 'delete').mockImplementation(async () => {
      teamExists = false;
      return { success: true } as any;
    });

    // 1st click
    const res1 = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);

    // 2nd click (double-click simulation)
    const res2 = await request(app)
      .delete(`/api/teams/${mockBaseTeam.id}`)
      .set('Authorization', `Bearer ${captainToken}`);

    expect(res2.status).toBe(404);
    expect(res2.body.success).toBe(false);
    expect(res2.body.message).toBe('Team not found');
  });
});

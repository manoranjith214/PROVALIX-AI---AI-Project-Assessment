import {
  createClassroomSchema,
  updateClassroomSchema,
  verifyClassroomCodeSchema,
  joinClassroomByCodeSchema,
} from '../src/validators/classroomValidator';
import { classroomService } from '../src/services/classroomService';
import { teamService } from '../src/services/teamService';
import { classroomRepository } from '../src/repositories/classroomRepository';
import { teamRepository } from '../src/repositories/teamRepository';
import { notificationService } from '../src/services/notificationService';
import { AppError } from '../src/middleware/errorMiddleware';

jest.spyOn(notificationService, 'notify').mockResolvedValue({} as any);

describe('CLASSROOM MANAGEMENT REQUIREMENTS (SPECIFICATION TESTS)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Requirement 1 & 2: Classroom Creation & Team Size Validation', () => {
    test('Validates Individual classroom creation schema with optional logo', () => {
      const parsed = createClassroomSchema.parse({
        name: 'Web Engineering 101',
        description: 'Frontend and Backend foundations',
        logo: 'https://example.com/logo.png',
        startDate: '2026-10-01T00:00:00Z',
        deadline: '2026-10-15T23:59:59Z',
        submissionMode: 'Individual',
      });

      expect(parsed.name).toBe('Web Engineering 101');
      expect(parsed.logo).toBe('https://example.com/logo.png');
      expect(parsed.submissionMode).toBe('Individual');
    });

    test('Validates Team classroom creation: Min = 2, Max = 4 (Example A)', () => {
      const parsed = createClassroomSchema.parse({
        name: 'Hackathon Alpha',
        startDate: '2026-10-01T00:00:00Z',
        deadline: '2026-10-15T23:59:59Z',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
      });

      expect(parsed.minTeamSize).toBe(2);
      expect(parsed.maxTeamSize).toBe(4);
    });

    test('Validates Team classroom creation: Min = 4, Max = 4 (Example B - Exact 4 members)', () => {
      const parsed = createClassroomSchema.parse({
        name: 'Hackathon Beta',
        startDate: '2026-10-01T00:00:00Z',
        deadline: '2026-10-15T23:59:59Z',
        submissionMode: 'Team',
        minTeamSize: 4,
        maxTeamSize: 4,
      });

      expect(parsed.minTeamSize).toBe(4);
      expect(parsed.maxTeamSize).toBe(4);
    });

    test('Validates Team classroom creation: Min = 2, Max = 20 (Upper limit)', () => {
      const parsed = createClassroomSchema.parse({
        name: 'Mega Hackathon',
        startDate: '2026-10-01T00:00:00Z',
        deadline: '2026-10-15T23:59:59Z',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 20,
      });

      expect(parsed.minTeamSize).toBe(2);
      expect(parsed.maxTeamSize).toBe(20);
    });

    test('Rejects invalid team sizes: min < 2, max > 20, min > max', () => {
      // Min < 2
      expect(() => {
        createClassroomSchema.parse({
          name: 'Invalid Min',
          startDate: '2026-10-01T00:00:00Z',
          deadline: '2026-10-15T23:59:59Z',
          submissionMode: 'Team',
          minTeamSize: 1,
          maxTeamSize: 4,
        });
      }).toThrow();

      // Max > 20
      expect(() => {
        createClassroomSchema.parse({
          name: 'Invalid Max',
          startDate: '2026-10-01T00:00:00Z',
          deadline: '2026-10-15T23:59:59Z',
          submissionMode: 'Team',
          minTeamSize: 2,
          maxTeamSize: 21,
        });
      }).toThrow();

      // Min > Max
      expect(() => {
        createClassroomSchema.parse({
          name: 'Invalid Relation',
          startDate: '2026-10-01T00:00:00Z',
          deadline: '2026-10-15T23:59:59Z',
          submissionMode: 'Team',
          minTeamSize: 5,
          maxTeamSize: 4,
        });
      }).toThrow();
    });

    test('Service createClassroom enforces deadline strictly after startDate', async () => {
      await expect(
        classroomService.createClassroom('usr-admin', {
          name: 'Time Travel 101',
          startDate: new Date('2026-10-15T00:00:00Z'),
          deadline: new Date('2026-10-10T00:00:00Z'),
        })
      ).rejects.toThrow('Submission deadline must be strictly after the start date');
    });

    test('Service createClassroom stores logo, minTeamSize, maxTeamSize', async () => {
      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(null);
      const createSpy = jest.spyOn(classroomRepository, 'create').mockResolvedValue({
        id: 'cls-new',
        name: 'AI Bootcamp',
        code: 'CLS-99999',
        logo: 'https://cdn.provalix.ai/logos/bootcamp.png',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
      } as any);

      const result = await classroomService.createClassroom('usr-admin', {
        name: 'AI Bootcamp',
        logo: 'https://cdn.provalix.ai/logos/bootcamp.png',
        startDate: '2026-10-01T00:00:00Z',
        deadline: '2026-10-15T23:59:59Z',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
      });

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          logo: 'https://cdn.provalix.ai/logos/bootcamp.png',
          submissionMode: 'Team',
          minTeamSize: 2,
          maxTeamSize: 4,
        })
      );
      expect(result?.id).toBe('cls-new');
    });
  });

  describe('Requirement 3: Classroom Join Flow - Step 1 Verification', () => {
    test('Rejects invalid classroom code with clear error', async () => {
      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(null);

      await expect(classroomService.verifyCode('UNKNOWN-CODE', 'usr-student')).rejects.toThrow(
        'Invalid Classroom Code'
      );
    });

    test('Rejects closed / archived classroom', async () => {
      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue({
        id: 'cls-closed',
        status: 'Archived',
      } as any);

      await expect(classroomService.verifyCode('CLS-CLOSED', 'usr-student')).rejects.toThrow(
        'This classroom is archived or closed for joining'
      );
    });

    test('Returns classroom metadata and user team readiness for Team classroom', async () => {
      const mockClassroom = {
        id: 'cls-team',
        name: 'Team Hackathon',
        code: 'CLS-HACK',
        logo: 'https://cdn.provalix.ai/logos/hack.png',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-admin',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockClassroom as any);
      jest.spyOn(classroomRepository, 'findMember').mockResolvedValue(null);

      jest.spyOn(teamRepository, 'listUserTeams').mockResolvedValue([
        { id: 'team-1', name: 'Alpha Squad', code: 'TM-ALPHA', captainId: 'usr-student' } as any,
      ]);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-1',
        members: [{ userId: 'usr-student' }, { userId: 'usr-2' }, { userId: 'usr-3' }],
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);

      const verified = await classroomService.verifyCode('CLS-HACK', 'usr-student');

      expect(verified.id).toBe('cls-team');
      expect(verified.submissionMode).toBe('Team');
      expect(verified.minTeamSize).toBe(2);
      expect(verified.maxTeamSize).toBe(4);
      expect(verified.userTeams.length).toBe(1);
      expect(verified.userTeams[0].memberCount).toBe(3);
      expect(verified.userTeams[0].isValidSize).toBe(true);
      expect(verified.userTeams[0].isIncomplete).toBe(false);
    });
  });

  describe('Requirement 3, 4 & 5: Individual vs Team Join Flow & Validation', () => {
    test('INDIVIDUAL MODE: Join request sets Pending Approval status and notifies owner', async () => {
      const mockIndividualClassroom = {
        id: 'cls-ind',
        name: 'CS50 Intro',
        code: 'CLS-CS50',
        submissionMode: 'Individual',
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockIndividualClassroom as any);
      jest.spyOn(classroomRepository, 'findMember').mockResolvedValue(null);
      const addMemberSpy = jest.spyOn(classroomRepository, 'addMember').mockResolvedValue({} as any);

      const res = await classroomService.joinByCode('usr-alice', { code: 'CLS-CS50' });

      expect(addMemberSpy).toHaveBeenCalledWith('cls-ind', 'usr-alice', 'MEMBER', 'Pending Approval');
      expect(res.status).toBe('Pending Approval');
      expect(res.message).toContain('Waiting for Classroom Admin approval');
    });

    test('TEAM MODE: Requires Team ID / Team Code', async () => {
      const mockTeamClassroom = {
        id: 'cls-team',
        code: 'CLS-TEAM',
        submissionMode: 'Team',
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);

      await expect(
        classroomService.joinByCode('usr-alice', { code: 'CLS-TEAM' })
      ).rejects.toThrow('Enter Team ID / Team Code to join this team-mode classroom');
    });

    test('TEAM MODE: Rejects if user does not belong to specified team', async () => {
      const mockTeamClassroom = {
        id: 'cls-team',
        code: 'CLS-TEAM',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-foreign',
        name: 'Foreign Team',
        captainId: 'usr-bob',
        members: [{ userId: 'usr-bob' }, { userId: 'usr-charlie' }],
        status: 'ACTIVE',
      } as any);

      await expect(
        classroomService.joinByCode('usr-intruder', { code: 'CLS-TEAM', teamIdentifier: 'team-foreign' })
      ).rejects.toThrow('You do not belong to this team');
    });

    test('TEAM SIZE: 1 member rejects when min=2 (Needs at least 2 members)', async () => {
      const mockTeamClassroom = {
        id: 'cls-team',
        code: 'CLS-TEAM',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-solo',
        name: 'Solo Coder',
        captainId: 'usr-solo',
        members: [{ userId: 'usr-solo' }],
        status: 'ACTIVE',
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);

      await expect(
        classroomService.joinByCode('usr-solo', { code: 'CLS-TEAM', teamIdentifier: 'team-solo' })
      ).rejects.toThrow('Incomplete Team – 1/2 Members');
    });

    test('TEAM SIZE: 5 members rejects when max=4 (Exceeds maximum team size of 4)', async () => {
      const mockTeamClassroom = {
        id: 'cls-team',
        code: 'CLS-TEAM',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-5',
        name: 'Five Stars',
        captainId: 'usr-lead',
        members: [
          { userId: 'usr-lead' },
          { userId: 'u2' },
          { userId: 'u3' },
          { userId: 'u4' },
          { userId: 'u5' },
        ],
        status: 'ACTIVE',
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);

      await expect(
        classroomService.joinByCode('usr-lead', { code: 'CLS-TEAM', teamIdentifier: 'team-5' })
      ).rejects.toThrow('Your team exceeds the maximum team size of 4');
    });

    test('TEAM SIZE: 3 members allowed when min=2, max=4 (Submits Pending Approval)', async () => {
      const mockTeamClassroom = {
        id: 'cls-team',
        name: 'Hackathon A',
        code: 'CLS-HACKA',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-3',
        name: 'Trio Tech',
        captainId: 'usr-lead',
        members: [{ userId: 'usr-lead' }, { userId: 'u2' }, { userId: 'u3' }],
        status: 'ACTIVE',
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);
      const createPartSpy = jest
        .spyOn(teamRepository, 'createOrUpdateParticipation')
        .mockResolvedValue({ id: 'part-3', status: 'Pending Approval' } as any);

      const res = await classroomService.joinByCode('usr-lead', {
        code: 'CLS-HACKA',
        teamIdentifier: 'team-3',
      });

      expect(createPartSpy).toHaveBeenCalledWith('cls-team', 'team-3', 'Pending Approval');
      expect(res.status).toBe('Pending Approval');
      expect(res.message).toContain('Team verified — 3/4 members');
    });

    test('TEAM SIZE (Hackathon B): Min=4, Max=4 -> 3 members REJECTED as Incomplete Team', async () => {
      const mockTeamClassroom = {
        id: 'cls-hackb',
        code: 'CLS-HACKB',
        submissionMode: 'Team',
        minTeamSize: 4,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-3of4',
        name: 'Almost There',
        captainId: 'usr-lead',
        members: [{ userId: 'usr-lead' }, { userId: 'u2' }, { userId: 'u3' }],
        status: 'ACTIVE',
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);

      await expect(
        classroomService.joinByCode('usr-lead', { code: 'CLS-HACKB', teamIdentifier: 'team-3of4' })
      ).rejects.toThrow('Incomplete Team – 3/4 Members');
    });

    test('TEAM SIZE (Hackathon B): Min=4, Max=4 -> 4 members ALLOWED', async () => {
      const mockTeamClassroom = {
        id: 'cls-hackb',
        name: 'Hackathon B',
        code: 'CLS-HACKB',
        submissionMode: 'Team',
        minTeamSize: 4,
        maxTeamSize: 4,
        status: 'Active',
        ownerId: 'usr-instructor',
      };

      jest.spyOn(classroomRepository, 'findByCode').mockResolvedValue(mockTeamClassroom as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-4of4',
        name: 'The Four',
        captainId: 'usr-lead',
        members: [{ userId: 'usr-lead' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' }],
        status: 'ACTIVE',
      } as any);
      jest.spyOn(teamRepository, 'findClassroomParticipation').mockResolvedValue(null);
      const createPartSpy = jest
        .spyOn(teamRepository, 'createOrUpdateParticipation')
        .mockResolvedValue({ id: 'part-4', status: 'Pending Approval' } as any);

      const res = await classroomService.joinByCode('usr-lead', {
        code: 'CLS-HACKB',
        teamIdentifier: 'team-4of4',
      });

      expect(createPartSpy).toHaveBeenCalledWith('cls-hackb', 'team-4of4', 'Pending Approval');
      expect(res.status).toBe('Pending Approval');
      expect(res.message).toContain('Team verified — 4/4 members');
    });
  });

  describe('Requirement 6 & 7: Admin Approval and Backend Re-check', () => {
    test('Admin approves Individual student participation', async () => {
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-ind',
        ownerId: 'usr-admin',
      } as any);
      const updateStatusSpy = jest
        .spyOn(classroomRepository, 'updateMemberStatus')
        .mockResolvedValue({} as any);

      const res = await classroomService.approveMember('cls-ind', 'usr-student', 'usr-admin');

      expect(updateStatusSpy).toHaveBeenCalledWith('cls-ind', 'usr-student', 'Approved');
      expect(res.message).toBe('Participant approved successfully');
    });

    test('Non-admin CANNOT approve participant', async () => {
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-ind',
        ownerId: 'usr-admin',
      } as any);

      await expect(
        classroomService.approveMember('cls-ind', 'usr-student', 'usr-imposter')
      ).rejects.toThrow('Only the Classroom Admin can approve participants');
    });

    test('Admin CANNOT approve incomplete team: Backend re-check blocks approval', async () => {
      const mockClassroom = {
        id: 'cls-strict',
        name: 'Strict 4-Member Hackathon',
        ownerId: 'usr-admin',
        minTeamSize: 4,
        maxTeamSize: 4,
        members: [],
      };

      const mockIncompleteTeam = {
        id: 'team-incomplete',
        name: 'Missing Member Squad',
        maxSize: 4,
        captainId: 'usr-lead',
        members: [{ userId: 'usr-lead' }, { userId: 'u2' }, { userId: 'u3' }], // 3 members < 4
      };

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'findParticipationById').mockResolvedValue({
        id: 'part-incomp',
        classroomId: 'cls-strict',
        teamId: 'team-incomplete',
        status: 'Incomplete Team',
      } as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockIncompleteTeam as any);

      await expect(
        teamService.approveClassroomParticipation('cls-strict', 'part-incomp', 'usr-admin')
      ).rejects.toThrow('Cannot approve incomplete team (3/4 Members). Classroom requires at least 4 members.');
    });

    test('Admin CAN approve team when size matches requirements (4/4 members)', async () => {
      const mockClassroom = {
        id: 'cls-strict',
        name: 'Strict 4-Member Hackathon',
        ownerId: 'usr-admin',
        minTeamSize: 4,
        maxTeamSize: 4,
        members: [],
      };

      const mockCompleteTeam = {
        id: 'team-full',
        name: 'Complete Squad',
        maxSize: 4,
        captainId: 'usr-lead',
        members: [{ userId: 'usr-lead' }, { userId: 'u2' }, { userId: 'u3' }, { userId: 'u4' }],
      };

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'findParticipationById').mockResolvedValue({
        id: 'part-full',
        classroomId: 'cls-strict',
        teamId: 'team-full',
        status: 'Pending Approval',
      } as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockCompleteTeam as any);
      const updatePartSpy = jest
        .spyOn(teamRepository, 'updateParticipationStatus')
        .mockResolvedValue({ id: 'part-full', status: 'Approved' } as any);
      const addMemberSpy = jest.spyOn(classroomRepository, 'addMember').mockResolvedValue({} as any);

      const res = await teamService.approveClassroomParticipation('cls-strict', 'part-full', 'usr-admin');

      expect(updatePartSpy).toHaveBeenCalledWith('part-full', 'Approved', 'usr-admin');
      expect(addMemberSpy).toHaveBeenCalledTimes(4); // auto-enrolls 4 members
      expect(res.status).toBe('Approved');
    });
  });

  describe('Requirement 11: Classroom Settings & Safeguards', () => {
    test('Prevents changing submissionMode if submissions already exist', async () => {
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-locked',
        submissionMode: 'Individual',
      } as any);
      jest.spyOn(classroomRepository, 'countSubmissions').mockResolvedValue(3);

      await expect(
        classroomService.updateClassroom('cls-locked', { submissionMode: 'Team' })
      ).rejects.toThrow(
        'Cannot change submission mode because submissions already exist for this classroom'
      );
    });

    test('Prevents deleting classroom if submissions already exist', async () => {
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-with-subs',
        name: 'Final Exam Classroom',
      } as any);
      jest.spyOn(classroomRepository, 'countSubmissions').mockResolvedValue(5);

      await expect(classroomService.deleteClassroom('cls-with-subs')).rejects.toThrow(
        'Cannot delete classroom because 5 submission(s) have already been submitted'
      );
    });

    test('Allows updating logo, minTeamSize, maxTeamSize when valid', async () => {
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-edit',
        name: 'Original Title',
        submissionMode: 'Team',
        minTeamSize: 2,
        maxTeamSize: 4,
      } as any);
      jest.spyOn(classroomRepository, 'countSubmissions').mockResolvedValue(0);
      const updateSpy = jest.spyOn(classroomRepository, 'update').mockResolvedValue({
        id: 'cls-edit',
        name: 'Updated Title',
        logo: 'https://cdn.provalix.ai/new-logo.png',
        minTeamSize: 3,
        maxTeamSize: 6,
      } as any);

      const result = await classroomService.updateClassroom('cls-edit', {
        name: 'Updated Title',
        logo: 'https://cdn.provalix.ai/new-logo.png',
        minTeamSize: 3,
        maxTeamSize: 6,
      });

      expect(updateSpy).toHaveBeenCalledWith('cls-edit', expect.objectContaining({
        name: 'Updated Title',
        logo: 'https://cdn.provalix.ai/new-logo.png',
        minTeamSize: 3,
        maxTeamSize: 6,
      }));
      expect(result?.name).toBe('Updated Title');
    });
  });
});

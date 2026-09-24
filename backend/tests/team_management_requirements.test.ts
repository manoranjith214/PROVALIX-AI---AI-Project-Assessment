import {
  createTeamSchema,
  updateTeamSchema,
  requestClassroomParticipationSchema,
} from '../src/validators/teamValidator';
import { teamService } from '../src/services/teamService';
import { teamRepository } from '../src/repositories/teamRepository';
import { classroomRepository } from '../src/repositories/classroomRepository';
import { userRepository } from '../src/repositories/userRepository';
import { notificationService } from '../src/services/notificationService';
import { AppError } from '../src/middleware/errorMiddleware';

jest.spyOn(notificationService, 'notify').mockResolvedValue({} as any);

describe('TEAM MANAGEMENT REQUIREMENTS (SPECIFICATION TESTS)', () => {
  describe('Requirement 2: Max Team Size Validation (2 to 20)', () => {
    test('Accepts team creation with size 2', () => {
      const parsed = createTeamSchema.parse({ name: 'Alpha Squad', maxSize: 2 });
      expect(parsed.maxSize).toBe(2);
    });

    test('Accepts team creation with size 20', () => {
      const parsed = createTeamSchema.parse({ name: 'Omega Legion', maxSize: 20 });
      expect(parsed.maxSize).toBe(20);
    });

    test('Rejects team creation with size 1', () => {
      expect(() => {
        createTeamSchema.parse({ name: 'Solo', maxSize: 1 });
      }).toThrow();
    });

    test('Rejects team creation with size 21', () => {
      expect(() => {
        createTeamSchema.parse({ name: 'Crowd', maxSize: 21 });
      }).toThrow();
    });

    test('Accepts update team with size 2 and size 20', () => {
      expect(updateTeamSchema.parse({ maxSize: 2 }).maxSize).toBe(2);
      expect(updateTeamSchema.parse({ maxSize: 20 }).maxSize).toBe(20);
    });

    test('Rejects update team with size 1 and size 21', () => {
      expect(() => updateTeamSchema.parse({ maxSize: 1 })).toThrow();
      expect(() => updateTeamSchema.parse({ maxSize: 21 })).toThrow();
    });
  });

  describe('Requirement 4 & 5: Classroom Participation Approval Gate (Exact Rule)', () => {
    const mockCaptain = { id: 'usr-captain', name: 'Captain Alex', permanentId: 'PRV-10001' };
    const mockAdmin = { id: 'usr-admin', name: 'Dr. Vance', permanentId: 'PRV-00001' };
    const mockClassroom = {
      id: 'cls-101',
      name: 'Capstone 2026',
      ownerId: mockAdmin.id,
      members: [{ userId: mockAdmin.id, role: 'OWNER' }],
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('Team Max Size = 4 with 3 members: can request classroom participation and receives Incomplete Team status', async () => {
      const mockTeam3 = {
        id: 'team-3of4',
        name: 'Quantum Core',
        maxSize: 4,
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: 'usr-2', role: 'MEMBER' },
          { userId: 'usr-3', role: 'MEMBER' },
        ],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam3 as any);
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'createOrUpdateParticipation').mockResolvedValue({
        id: 'part-1',
        classroomId: mockClassroom.id,
        teamId: mockTeam3.id,
        status: 'Incomplete Team',
      } as any);

      const participation = await teamService.requestClassroomParticipation(
        mockTeam3.id,
        mockCaptain.id,
        { classroomId: mockClassroom.id }
      );

      expect(participation.status).toBe('Incomplete Team');
      expect(teamRepository.createOrUpdateParticipation).toHaveBeenCalledWith(
        mockClassroom.id,
        mockTeam3.id,
        'Incomplete Team'
      );
    });

    test('Classroom Admin CANNOT approve 3/4 incomplete team: strictly blocked with error', async () => {
      const mockTeam3 = {
        id: 'team-3of4',
        name: 'Quantum Core',
        maxSize: 4,
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: 'usr-2', role: 'MEMBER' },
          { userId: 'usr-3', role: 'MEMBER' },
        ],
      };

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'findParticipationById').mockResolvedValue({
        id: 'part-1',
        classroomId: mockClassroom.id,
        teamId: mockTeam3.id,
        status: 'Incomplete Team',
      } as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam3 as any);

      await expect(
        teamService.approveClassroomParticipation(mockClassroom.id, 'part-1', mockAdmin.id)
      ).rejects.toThrow(/Cannot approve incomplete team \(3\/4 Members\)/);
    });

    test('Adding 4th member: team becomes 4/4 and status evaluates to Ready for Approval', async () => {
      const mockTeam4 = {
        id: 'team-4of4',
        name: 'Quantum Core',
        maxSize: 4,
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: 'usr-2', role: 'MEMBER' },
          { userId: 'usr-3', role: 'MEMBER' },
          { userId: 'usr-4', role: 'MEMBER' },
        ],
      };

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'listClassroomTeamParticipations').mockResolvedValue([
        {
          id: 'part-1',
          classroomId: mockClassroom.id,
          teamId: mockTeam4.id,
          status: 'Incomplete Team', // previously saved before 4th member joined
          teamMaxSize: 4,
        },
      ] as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam4 as any);

      const participations = await teamService.getClassroomTeamParticipations(
        mockClassroom.id,
        mockAdmin.id
      );

      expect(participations[0].displayStatus).toBe('Ready for Approval');
      expect(participations[0].canApprove).toBe(true);
      expect(participations[0].currentMembers).toBe(4);
    });

    test('Classroom Admin CAN approve 4/4 complete team: sets Approved and auto-enrolls members', async () => {
      const mockTeam4 = {
        id: 'team-4of4',
        name: 'Quantum Core',
        maxSize: 4,
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: 'usr-2', role: 'MEMBER' },
          { userId: 'usr-3', role: 'MEMBER' },
          { userId: 'usr-4', role: 'MEMBER' },
        ],
      };

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom as any);
      jest.spyOn(teamRepository, 'findParticipationById').mockResolvedValue({
        id: 'part-1',
        classroomId: mockClassroom.id,
        teamId: mockTeam4.id,
        status: 'Incomplete Team',
      } as any);
      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam4 as any);
      jest.spyOn(teamRepository, 'updateParticipationStatus').mockResolvedValue({
        id: 'part-1',
        classroomId: mockClassroom.id,
        teamId: mockTeam4.id,
        status: 'Approved',
      } as any);
      jest.spyOn(classroomRepository, 'addMember').mockResolvedValue({} as any);

      const result = await teamService.approveClassroomParticipation(
        mockClassroom.id,
        'part-1',
        mockAdmin.id
      );

      expect(result.status).toBe('Approved');
      expect(classroomRepository.addMember).toHaveBeenCalledTimes(4);
    });

    test('Cannot add 5th member to full 4/4 team: invite/accept blocked', async () => {
      const mockTeam4 = {
        id: 'team-4of4',
        name: 'Quantum Core',
        maxSize: 4,
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: 'usr-2', role: 'MEMBER' },
          { userId: 'usr-3', role: 'MEMBER' },
          { userId: 'usr-4', role: 'MEMBER' },
        ],
        invitations: [],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam4 as any);

      await expect(
        teamService.inviteMember(mockTeam4.id, mockCaptain.id, 'PRV-10005')
      ).rejects.toThrow(/Team has reached its maximum size of 4 members/);
    });
  });

  describe('Requirements 1, 3, 7, 8, 9: Logo, Member Actions, Archive, Delete Safeguard, Permissions', () => {
    const mockCaptain = { id: 'usr-captain', name: 'Captain Alex', permanentId: 'PRV-10001' };
    const mockMember = { id: 'usr-member', name: 'Member Bob', permanentId: 'PRV-10002' };

    test('Upload/change team logo: Captain allowed, non-captain forbidden', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [{ userId: mockCaptain.id }],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(teamRepository, 'update').mockResolvedValue({ ...mockTeam, logo: '/uploads/new-logo.png' } as any);

      // Captain succeeds
      const res = await teamService.uploadLogo(mockTeam.id, mockCaptain.id, '/uploads/new-logo.png');
      expect(res.logoUrl).toBe('/uploads/new-logo.png');
      expect(teamRepository.update).toHaveBeenCalledWith(mockTeam.id, { logo: '/uploads/new-logo.png' });

      // Non-captain forbidden
      await expect(
        teamService.uploadLogo(mockTeam.id, mockMember.id, '/uploads/hack.png')
      ).rejects.toThrow(/Only the team captain can modify the team logo/);
    });

    test('Archive / Deactivate team: Captain allowed, non-captain forbidden', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [{ userId: mockCaptain.id }],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(teamRepository, 'update').mockImplementation(async (id, data) => ({ ...mockTeam, ...data } as any));

      const archiveRes = await teamService.archiveTeam(mockTeam.id, mockCaptain.id);
      expect(archiveRes.team.status).toBe('ARCHIVED');

      const deactivateRes = await teamService.deactivateTeam(mockTeam.id, mockCaptain.id);
      expect(deactivateRes.team.status).toBe('DEACTIVATED');

      await expect(teamService.archiveTeam(mockTeam.id, mockMember.id)).rejects.toThrow(/Only the team captain/);
    });

    test('Delete team safeguard: blocks permanent deletion if team has submissions', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [{ userId: mockCaptain.id }],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(2); // 2 submissions exist

      await expect(teamService.deleteTeam(mockTeam.id, mockCaptain.id)).rejects.toThrow(
        /Cannot permanently delete team with existing submissions/
      );
    });

    test('Delete team: deletes cleanly when no submissions or approved participations exist', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [{ userId: mockCaptain.id }],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(teamRepository, 'countSubmissions').mockResolvedValue(0);
      jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([]);
      jest.spyOn(teamRepository, 'delete').mockResolvedValue(mockTeam as any);

      const res = await teamService.deleteTeam(mockTeam.id, mockCaptain.id);
      expect(res.message).toBe('Team deleted successfully');
    });

    test('Leave team: normal member can leave, captain cannot leave without transfer', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: mockMember.id, role: 'MEMBER' },
        ],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(teamRepository, 'removeMember').mockResolvedValue({} as any);

      // Normal member leaves
      const leaveRes = await teamService.leaveTeam(mockTeam.id, mockMember.id);
      expect(leaveRes.message).toBe('Successfully left the team');

      // Captain attempts to leave directly
      await expect(teamService.leaveTeam(mockTeam.id, mockCaptain.id)).rejects.toThrow(
        /Captain cannot simply leave/
      );
    });

    test('Transfer captaincy: Captain can transfer to active member, but not non-member', async () => {
      const mockTeam = {
        id: 'team-1',
        name: 'Apex',
        captainId: mockCaptain.id,
        members: [
          { userId: mockCaptain.id, role: 'CAPTAIN' },
          { userId: mockMember.id, role: 'MEMBER' },
        ],
      };

      jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam as any);
      jest.spyOn(userRepository, 'findByIdOrPermanentId').mockImplementation(async (id) => {
        if (id === mockMember.id) return mockMember as any;
        return null;
      });
      jest.spyOn(teamRepository, 'transferCaptain').mockResolvedValue({
        ...mockTeam,
        captainId: mockMember.id,
      } as any);

      const transferred = await teamService.transferCaptaincy(mockTeam.id, mockCaptain.id, mockMember.id);
      expect(transferred?.captainId).toBe(mockMember.id);

      // Non-member
      await expect(
        teamService.transferCaptaincy(mockTeam.id, mockCaptain.id, 'unknown-id')
      ).rejects.toThrow(/Target new captain was not found/);
    });
  });
});

import { classroomRepository } from '../repositories/classroomRepository';
import { userRepository } from '../repositories/userRepository';
import { teamRepository } from '../repositories/teamRepository';
import { notificationService } from './notificationService';
import { generateClassroomCode } from '../utils/idGenerator';
import { PaginationParams } from '../types';
import { AppError } from '../middleware/errorMiddleware';

export class ClassroomService {
  async createClassroom(
    userId: string,
    data: {
      name: string;
      description?: string;
      logo?: string;
      startDate: string | Date;
      deadline: string | Date;
      submissionMode?: string;
      minTeamSize?: number;
      maxTeamSize?: number;
      resources?: any[];
    }
  ) {
    const start = new Date(data.startDate);
    const end = new Date(data.deadline);

    if (end <= start) {
      throw new AppError('Submission deadline must be strictly after the start date', 400);
    }

    const mode = (data.submissionMode || 'Individual').toLowerCase() === 'team' ? 'Team' : 'Individual';

    let minTeamSize = 2;
    let maxTeamSize = 4;
    if (mode === 'Team') {
      minTeamSize = data.minTeamSize ?? 2;
      maxTeamSize = data.maxTeamSize ?? 4;

      if (minTeamSize < 2 || minTeamSize > 20) {
        throw new AppError('Minimum team size must be between 2 and 20', 400);
      }
      if (maxTeamSize < 2 || maxTeamSize > 20) {
        throw new AppError('Maximum team size must be between 2 and 20', 400);
      }
      if (minTeamSize > maxTeamSize) {
        throw new AppError('Minimum team size cannot exceed maximum team size', 400);
      }
    }

    let code = generateClassroomCode();
    while (await classroomRepository.findByCode(code)) {
      code = generateClassroomCode();
    }

    return classroomRepository.create({
      name: data.name,
      description: data.description,
      logo: data.logo,
      code,
      ownerId: userId,
      startDate: start,
      deadline: end,
      submissionMode: mode,
      minTeamSize: mode === 'Team' ? minTeamSize : undefined,
      maxTeamSize: mode === 'Team' ? maxTeamSize : undefined,
      resourcesConfig: data.resources ? JSON.stringify(data.resources) : undefined,
    });
  }

  async listClassrooms(userId: string, params: PaginationParams) {
    return classroomRepository.list(userId, params);
  }

  async getClassroomById(classroomId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    return classroom;
  }

  async updateClassroom(classroomId: string, data: any) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    const submissionCount = await classroomRepository.countSubmissions(classroomId);

    // Prevent changing submission mode if submissions already exist
    if (data.submissionMode && submissionCount > 0) {
      const newMode = data.submissionMode.toLowerCase() === 'team' ? 'Team' : 'Individual';
      if (newMode !== classroom.submissionMode) {
        throw new AppError(
          'Cannot change submission mode because submissions already exist for this classroom',
          400
        );
      }
    }

    const updatePayload: any = {};
    if (data.name) updatePayload.name = data.name;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.logo !== undefined) updatePayload.logo = data.logo;
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    if (data.deadline) updatePayload.deadline = new Date(data.deadline);

    if (data.submissionMode) {
      updatePayload.submissionMode =
        data.submissionMode.toLowerCase() === 'team' ? 'Team' : 'Individual';
    }

    if (data.minTeamSize !== undefined || data.maxTeamSize !== undefined) {
      const newMin = data.minTeamSize !== undefined ? data.minTeamSize : (classroom.minTeamSize ?? 2);
      const newMax = data.maxTeamSize !== undefined ? data.maxTeamSize : (classroom.maxTeamSize ?? 4);

      if (newMin < 2 || newMin > 20 || newMax < 2 || newMax > 20) {
        throw new AppError('Team size must be between 2 and 20', 400);
      }
      if (newMin > newMax) {
        throw new AppError('Minimum team size cannot exceed maximum team size', 400);
      }
      updatePayload.minTeamSize = newMin;
      updatePayload.maxTeamSize = newMax;
    }

    if (data.resources) updatePayload.resourcesConfig = JSON.stringify(data.resources);
    if (data.status) updatePayload.status = data.status;

    return classroomRepository.update(classroomId, updatePayload);
  }

  async deleteClassroom(classroomId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    const submissionCount = await classroomRepository.countSubmissions(classroomId);
    if (submissionCount > 0) {
      throw new AppError(
        `Cannot delete classroom because ${submissionCount} submission(s) have already been submitted. Please archive the classroom instead.`,
        400
      );
    }

    await classroomRepository.delete(classroomId);
    return { message: 'Classroom deleted successfully' };
  }

  async verifyCode(code: string, userId: string) {
    const classroom = await classroomRepository.findByCode(code.trim().toUpperCase());
    if (!classroom) {
      throw new AppError('Invalid Classroom Code', 404);
    }

    if (classroom.status && classroom.status !== 'Active') {
      throw new AppError('This classroom is archived or closed for joining', 400);
    }

    const isOwner = classroom.ownerId === userId;
    const existingMember = await classroomRepository.findMember(classroom.id, userId);

    let userTeams: any[] = [];
    if (classroom.submissionMode === 'Team') {
      const userTeamsList = await teamRepository.listUserTeams(userId);
      userTeams = await Promise.all(
        userTeamsList.map(async (t) => {
          const team = await teamRepository.findById(t.id);
          const memberCount = team ? team.members.length : 0;
          const minSize = classroom.minTeamSize ?? 2;
          const maxSize = classroom.maxTeamSize ?? 4;
          const participation = await teamRepository.findClassroomParticipation(classroom.id, t.id);
          return {
            id: t.id,
            name: t.name,
            code: t.code,
            logo: t.logo,
            memberCount,
            minSize,
            maxSize,
            isCaptain: t.captainId === userId,
            isValidSize: memberCount >= minSize && memberCount <= maxSize,
            isIncomplete: memberCount < minSize,
            isTooLarge: memberCount > maxSize,
            participationStatus: participation ? participation.status : null,
          };
        })
      );
    }

    return {
      id: classroom.id,
      name: classroom.name,
      description: classroom.description,
      code: classroom.code,
      logo: classroom.logo,
      startDate: classroom.startDate,
      deadline: classroom.deadline,
      submissionMode: classroom.submissionMode,
      minTeamSize: classroom.minTeamSize ?? 2,
      maxTeamSize: classroom.maxTeamSize ?? 4,
      status: classroom.status,
      isOwner,
      isEnrolled: !!existingMember,
      memberRole: existingMember ? existingMember.role : null,
      memberStatus: existingMember ? existingMember.status : null,
      userTeams,
    };
  }

  async joinByCode(userId: string, data: { code: string; teamIdentifier?: string }) {
    const classroom = await classroomRepository.findByCode(data.code.trim().toUpperCase());
    if (!classroom) {
      throw new AppError('Invalid Classroom Code', 404);
    }

    if (classroom.status && classroom.status !== 'Active') {
      throw new AppError('This classroom is closed for joining', 400);
    }

    if (classroom.ownerId === userId) {
      return { message: 'You are the owner of this classroom', classroomId: classroom.id, role: 'OWNER' };
    }

    // INDIVIDUAL MODE
    if (classroom.submissionMode === 'Individual') {
      const existingMember = await classroomRepository.findMember(classroom.id, userId);
      if (existingMember) {
        if (existingMember.status === 'Pending Approval') {
          return {
            message: 'Join request already submitted. Waiting for Classroom Admin approval.',
            classroomId: classroom.id,
            status: 'Pending Approval',
          };
        }
        if (existingMember.status === 'Approved') {
          return {
            message: 'You are already a participant in this classroom',
            classroomId: classroom.id,
            status: 'Approved',
          };
        }
      }

      await classroomRepository.addMember(classroom.id, userId, 'MEMBER', 'Pending Approval');

      await notificationService.notify(
        classroom.ownerId,
        'classroom_invitation',
        'New Classroom Join Request',
        `A student submitted a join request for "${classroom.name}". Waiting for your approval.`,
        `/classrooms/${classroom.id}`
      );

      return {
        message: 'Join request submitted. Waiting for Classroom Admin approval.',
        classroomId: classroom.id,
        status: 'Pending Approval',
      };
    }

    // TEAM MODE
    if (!data.teamIdentifier) {
      throw new AppError('Enter Team ID / Team Code to join this team-mode classroom', 400);
    }

    let team: any = await teamRepository.findById(data.teamIdentifier);
    if (!team) {
      team = await teamRepository.findByCode(data.teamIdentifier.trim().toUpperCase());
    }
    if (!team) {
      throw new AppError('Specified team was not found', 404);
    }

    // Verify user belongs to that team
    const isTeamMember = team.members.some((m: any) => m.userId === userId) || team.captainId === userId;
    if (!isTeamMember) {
      throw new AppError(
        'You do not belong to this team. You can only join classrooms with teams you are a member of.',
        403
      );
    }

    // Verify team is active
    if (team.status && team.status !== 'ACTIVE') {
      throw new AppError(`Cannot join classroom: team is currently ${team.status.toLowerCase()}`, 400);
    }

    // Verify team is not already participating
    const existingPart = await teamRepository.findClassroomParticipation(classroom.id, team.id);
    if (existingPart) {
      if (existingPart.status === 'Approved') {
        throw new AppError('This team is already participating and approved in this classroom', 400);
      }
      if (existingPart.status === 'Pending Approval' || existingPart.status === 'Ready for Approval') {
        return {
          message: 'Join request already submitted for this team. Waiting for Classroom Admin approval.',
          classroomId: classroom.id,
          teamId: team.id,
          status: existingPart.status,
        };
      }
    }

    const memberCount = team.members.length;
    const minSize = classroom.minTeamSize ?? 2;
    const maxSize = classroom.maxTeamSize ?? 4;

    if (memberCount < minSize) {
      throw new AppError(
        `Incomplete Team – ${memberCount}/${minSize} Members. Your team needs at least ${minSize} members to join this classroom. Add members to your team before joining this classroom.`,
        400
      );
    }

    if (memberCount > maxSize) {
      throw new AppError(
        `Your team exceeds the maximum team size of ${maxSize}. Current members: ${memberCount}.`,
        400
      );
    }

    // Team satisfies min and max size
    await teamRepository.createOrUpdateParticipation(
      classroom.id,
      team.id,
      'Pending Approval'
    );

    await notificationService.notify(
      classroom.ownerId,
      'classroom_invitation',
      'Team Join Request Submitted',
      `Team "${team.name}" (${memberCount}/${maxSize} members) requested to join "${classroom.name}".`,
      `/classrooms/${classroom.id}`
    );

    return {
      message: `Team verified — ${memberCount}/${maxSize} members. Join request submitted. Waiting for Classroom Admin approval.`,
      classroomId: classroom.id,
      teamId: team.id,
      status: 'Pending Approval',
    };
  }

  async approveMember(classroomId: string, memberUserId: string, adminUserId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    if (classroom.ownerId !== adminUserId) {
      throw new AppError('Only the Classroom Admin can approve participants', 403);
    }

    await classroomRepository.updateMemberStatus(classroomId, memberUserId, 'Approved');

    await notificationService.notify(
      memberUserId,
      'classroom_invitation',
      'Classroom Join Request Approved',
      `Your request to join "${classroom.name}" has been approved!`,
      `/classrooms/${classroomId}`
    );

    return { message: 'Participant approved successfully' };
  }

  async rejectMember(classroomId: string, memberUserId: string, adminUserId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    if (classroom.ownerId !== adminUserId) {
      throw new AppError('Only the Classroom Admin can reject participants', 403);
    }

    await classroomRepository.updateMemberStatus(classroomId, memberUserId, 'Rejected');

    await notificationService.notify(
      memberUserId,
      'classroom_invitation',
      'Classroom Join Request Rejected',
      `Your request to join "${classroom.name}" was declined.`,
      `/classrooms`
    );

    return { message: 'Participant join request rejected' };
  }

  async uploadLogo(classroomId: string, logoDataUri: string, userId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    if (classroom.ownerId !== userId) {
      throw new AppError('Only Classroom Admin can update the classroom logo', 403);
    }

    await classroomRepository.update(classroomId, { logo: logoDataUri });
    return { message: 'Classroom logo updated successfully', logo: logoDataUri };
  }

  async inviteUser(classroomId: string, email: string, role: 'EVALUATOR' | 'MEMBER' = 'MEMBER') {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      // Add or update member directly as Approved
      await classroomRepository.addMember(classroomId, existingUser.id, role, 'Approved');

      await notificationService.notify(
        existingUser.id,
        'classroom_invitation',
        'Classroom Invitation',
        `You have been added to "${classroom.name}" as an ${role}.`,
        `/classrooms/${classroomId}`
      );
      return { message: `User added to classroom as ${role}` };
    }

    // Save pending invitation for non-registered email
    await classroomRepository.createInvitation(classroomId, email);
    return { message: `Invitation dispatched to ${email}` };
  }

  async assignEvaluator(classroomId: string, evaluatorIdentifier: string, submissionId?: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    const evaluatorUser = await userRepository.findByIdOrPermanentId(evaluatorIdentifier);
    if (!evaluatorUser) {
      throw new AppError(`Evaluator user "${evaluatorIdentifier}" not found`, 404);
    }

    const assignment = await classroomRepository.assignEvaluator(
      classroomId,
      evaluatorUser.id,
      submissionId
    );

    await notificationService.notify(
      evaluatorUser.id,
      'evaluator_assignment',
      'Evaluator Assignment',
      `You have been assigned as an evaluator for ${classroom.name}.`,
      `/classrooms/${classroomId}`
    );

    return assignment;
  }

  async removeEvaluator(assignmentId: string) {
    await classroomRepository.removeEvaluator(assignmentId);
    return { message: 'Evaluator assignment removed' };
  }
}

export const classroomService = new ClassroomService();


import { teamRepository } from '../repositories/teamRepository';
import { userRepository } from '../repositories/userRepository';
import { classroomRepository } from '../repositories/classroomRepository';
import { notificationService } from './notificationService';
import { generateTeamCode } from '../utils/idGenerator';
import { AppError } from '../middleware/errorMiddleware';
import { prisma } from '../config/prisma';

export class TeamService {
  async createTeam(userId: string, data: { name: string; logo?: string; maxSize?: number }) {
    let code = generateTeamCode();
    while (await teamRepository.findByCode(code)) {
      code = generateTeamCode();
    }

    return teamRepository.create({
      name: data.name,
      code,
      logo: data.logo,
      maxSize: data.maxSize || 4,
      captainId: userId,
      createdById: userId,
    });
  }

  async getUserTeams(userId: string) {
    return teamRepository.listUserTeams(userId);
  }

  async getUserInvitations(userId: string) {
    return teamRepository.getUserInvitations(userId);
  }

  async getTeamById(teamId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    return team;
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: { name?: string; logo?: string; maxSize?: number; status?: string }
  ) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== userId) {
      throw new AppError('Only the team captain can update team details', 403);
    }

    if (data.maxSize && data.maxSize < team.members.length) {
      throw new AppError(
        `Cannot reduce team size below current member count (${team.members.length})`,
        400
      );
    }

    return teamRepository.update(teamId, data);
  }

  async archiveTeam(teamId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== userId) {
      throw new AppError('Only the team captain can archive the team', 403);
    }

    const updated = await teamRepository.update(teamId, { status: 'ARCHIVED' });
    return { message: 'Team archived successfully', team: updated };
  }

  async deactivateTeam(teamId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== userId) {
      throw new AppError('Only the team captain can deactivate the team', 403);
    }

    const updated = await teamRepository.update(teamId, { status: 'DEACTIVATED' });
    return { message: 'Team deactivated successfully', team: updated };
  }

  async uploadLogo(teamId: string | undefined, userId: string, logoUrl: string) {
    if (teamId) {
      const team = await teamRepository.findById(teamId);
      if (!team) {
        throw new AppError('Team not found', 404);
      }
      if (team.captainId !== userId) {
        throw new AppError('Only the team captain can modify the team logo', 403);
      }
      await teamRepository.update(teamId, { logo: logoUrl });
    }
    return { logoUrl };
  }

  async deleteTeam(teamId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== userId) {
      throw new AppError('Only the team captain can delete the team', 403);
    }

    const submissionCount = await teamRepository.countSubmissions(teamId);
    if (submissionCount > 0) {
      throw new AppError(
        'Cannot permanently delete team with existing submissions or classroom evaluations. Please archive or deactivate the team to preserve historical academic records.',
        400
      );
    }

    const participations = await teamRepository.listTeamClassroomParticipations(teamId);
    const hasApproved = participations.some((p: any) => p.status === 'Approved');
    if (hasApproved) {
      throw new AppError(
        'Cannot permanently delete team with approved classroom records. Please archive or deactivate the team to preserve historical participation.',
        400
      );
    }

    await teamRepository.delete(teamId);
    return { message: 'Team deleted successfully' };
  }


  async inviteMember(teamId: string, captainUserId: string, targetUserIdentifier: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }

    // Only captain can invite members
    if (team.captainId !== captainUserId) {
      throw new AppError('Only the team captain can invite new members', 403);
    }

    // Prevent exceeding max size
    if (team.members.length >= team.maxSize) {
      throw new AppError(`Team has reached its maximum size of ${team.maxSize} members`, 400);
    }

    const targetUser = await userRepository.findByIdOrPermanentId(targetUserIdentifier);
    if (!targetUser) {
      throw new AppError(`User with identifier "${targetUserIdentifier}" was not found`, 404);
    }

    // Prevent duplicate members
    const isAlreadyMember = team.members.some((m) => m.userId === targetUser.id);
    if (isAlreadyMember) {
      throw new AppError('User is already a member of this team', 400);
    }

    // Prevent duplicate pending invitations
    const pendingInvite = team.invitations.find(
      (inv) => inv.userId === targetUser.id && inv.status === 'Pending'
    );
    if (pendingInvite) {
      throw new AppError('A pending invitation has already been dispatched to this user', 400);
    }

    const invitation = await teamRepository.createInvitation(teamId, targetUser.id);

    // Send notification
    await notificationService.notify(
      targetUser.id,
      'team_invitation',
      'Team Invitation Received',
      `You have been invited to join team "${team.name}" by captain ${team.captain.name}.`,
      `/teams/${team.id}`
    );

    return invitation;
  }

  async acceptInvite(inviteId: string, userId: string) {
    const invite = await teamRepository.findInvitationById(inviteId);
    if (!invite) {
      throw new AppError('Invitation not found', 404);
    }
    if (invite.userId !== userId) {
      throw new AppError('You are not authorized to respond to this invitation', 403);
    }
    if (invite.status !== 'Pending') {
      throw new AppError(`This invitation has already been ${invite.status.toLowerCase()}`, 400);
    }

    const team = await teamRepository.findById(invite.teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.members.length >= team.maxSize) {
      throw new AppError('This team is now full and cannot accept more members', 400);
    }

    await teamRepository.updateInvitationStatus(inviteId, 'Accepted');
    await teamRepository.addMember(team.id, userId, 'MEMBER');

    // Notify captain
    await notificationService.notify(
      team.captainId,
      'team_invitation',
      'Team Invitation Accepted',
      `${invite.user.name} accepted your invitation to join ${team.name}.`,
      `/teams/${team.id}`
    );

    return { message: 'Successfully joined team', teamId: team.id };
  }

  async rejectInvite(inviteId: string, userId: string) {
    const invite = await teamRepository.findInvitationById(inviteId);
    if (!invite) {
      throw new AppError('Invitation not found', 404);
    }
    if (invite.userId !== userId) {
      throw new AppError('You are not authorized to respond to this invitation', 403);
    }
    if (invite.status !== 'Pending') {
      throw new AppError(`This invitation has already been ${invite.status.toLowerCase()}`, 400);
    }

    await teamRepository.updateInvitationStatus(inviteId, 'Rejected');
    return { message: 'Invitation declined' };
  }

  async removeMember(teamId: string, captainUserId: string, targetUserId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== captainUserId) {
      throw new AppError('Only the team captain can remove members', 403);
    }
    if (team.captainId === targetUserId) {
      throw new AppError('Captain cannot be removed. Transfer captaincy first or delete the team.', 400);
    }

    await teamRepository.removeMember(teamId, targetUserId);

    await notificationService.notify(
      targetUserId,
      'team_invitation',
      'Removed from Team',
      `You were removed from team "${team.name}".`
    );

    return { message: 'Member removed successfully' };
  }

  async leaveTeam(teamId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId === userId) {
      throw new AppError('Captain cannot simply leave. Please transfer captaincy or delete the team.', 400);
    }

    await teamRepository.removeMember(teamId, userId);

    await notificationService.notify(
      team.captainId,
      'team_invitation',
      'Member Left Team',
      `A member has departed from team "${team.name}".`
    );

    return { message: 'Successfully left the team' };
  }

  async transferCaptaincy(teamId: string, currentCaptainId: string, newCaptainIdentifier: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== currentCaptainId) {
      throw new AppError('Only the current captain can transfer leadership', 403);
    }

    const newCaptain = await userRepository.findByIdOrPermanentId(newCaptainIdentifier);
    if (!newCaptain) {
      throw new AppError('Target new captain was not found', 404);
    }

    const isMember = team.members.some((m) => m.userId === newCaptain.id);
    if (!isMember) {
      throw new AppError('New captain must already be an active member of this team', 400);
    }

    const updated = await teamRepository.transferCaptain(teamId, newCaptain.id);

    await notificationService.notify(
      newCaptain.id,
      'team_invitation',
      'Captaincy Transferred',
      `You are now the Captain of team "${team.name}".`,
      `/teams/${team.id}`
    );

    return updated;
  }

  // --- Classroom Participation & Approval Gate ---

  async requestClassroomParticipation(
    teamId: string,
    captainUserId: string,
    identifier: { classroomId?: string; classroomCode?: string }
  ) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== captainUserId) {
      throw new AppError('Only the team captain can submit classroom participation requests', 403);
    }

    let classroom: any = null;
    if (identifier.classroomId) {
      classroom = await classroomRepository.findById(identifier.classroomId);
    } else if (identifier.classroomCode) {
      classroom = await classroomRepository.findByCode(identifier.classroomCode.trim().toUpperCase());
    }

    if (!classroom) {
      throw new AppError('Target classroom was not found', 404);
    }

    // Determine initial status based on team size vs maxSize
    const status =
      team.members.length < team.maxSize ? 'Incomplete Team' : 'Ready for Approval';

    const participation = await teamRepository.createOrUpdateParticipation(
      classroom.id,
      teamId,
      status
    );

    await notificationService.notify(
      classroom.ownerId,
      'classroom_invitation',
      'Team Participation Request',
      `Team "${team.name}" requested to participate in "${classroom.name}". Status: ${
        team.members.length < team.maxSize
          ? `Incomplete Team (${team.members.length}/${team.maxSize})`
          : 'Ready for Approval'
      }`,
      `/classrooms/${classroom.id}`
    );

    return participation;
  }

  async getTeamClassroomParticipations(teamId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    const isMember = team.members.some((m) => m.userId === userId) || team.captainId === userId;
    if (!isMember) {
      throw new AppError('You do not have permission to view this team', 403);
    }

    const participations = await teamRepository.listTeamClassroomParticipations(teamId);
    const result = [];

    for (const p of participations) {
      const memberCount = team.members.length;
      const maxSize = team.maxSize;
      let displayStatus = p.status;

      // Automatically evaluate dynamic readiness if still in pending approval phases
      if (p.status === 'Incomplete Team' || p.status === 'Ready for Approval') {
        if (memberCount < maxSize) {
          displayStatus = `Incomplete Team – ${memberCount}/${maxSize} Members`;
        } else {
          displayStatus = 'Ready for Approval';
        }
      }

      // Check submission records for this team in this classroom
      const submission = await prisma.submission.findFirst({
        where: {
          classroomId: p.classroomId,
          teamId,
        },
        include: {
          aiEvaluation: true,
          facultyEvaluation: true,
          verification: true,
        },
      });

      result.push({
        ...p,
        currentMembers: memberCount,
        maxSize,
        displayStatus,
        submission: submission
          ? {
              id: submission.id,
              title: submission.title,
              status: submission.status,
              finalTotalScore: submission.finalTotalScore,
              submittedAt: submission.submittedAt,
              evaluationStatus:
                submission.verification?.status ||
                (submission.finalTotalScore !== null ? 'Evaluated' : 'Pending'),
            }
          : null,
      });
    }

    return result;
  }

  async withdrawClassroomParticipation(teamId: string, participationId: string, userId: string) {
    const team = await teamRepository.findById(teamId);
    if (!team) {
      throw new AppError('Team not found', 404);
    }
    if (team.captainId !== userId) {
      throw new AppError('Only the team captain can withdraw participation', 403);
    }

    const participation = await teamRepository.findParticipationById(participationId);
    if (!participation || participation.teamId !== teamId) {
      throw new AppError('Participation record not found', 404);
    }

    const updated = await teamRepository.updateParticipationStatus(participationId, 'Withdrawn', userId);
    return { message: 'Participation withdrawn successfully', participation: updated };
  }

  async getClassroomTeamParticipations(classroomId: string, userId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    const isMember = classroom.members.some((m) => m.userId === userId) || classroom.ownerId === userId;
    if (!isMember) {
      throw new AppError('You do not have access to this classroom', 403);
    }

    const participations = await teamRepository.listClassroomTeamParticipations(classroomId);
    const result = [];

    for (const p of participations) {
      const team = await teamRepository.findById(p.teamId);
      const memberCount = team ? team.members.length : 0;
      const minSize = classroom.minTeamSize ?? (classroom.maxTeamSize ? 2 : (team ? team.maxSize : 2));
      const maxSize = classroom.maxTeamSize ?? (team ? team.maxSize : 4);
      let displayStatus = p.status;

      if (p.status === 'Incomplete Team' || p.status === 'Ready for Approval' || p.status === 'Pending Approval') {
        if (memberCount < minSize) {
          displayStatus = `Incomplete Team – ${memberCount}/${minSize} Members`;
        } else {
          displayStatus = 'Ready for Approval';
        }
      }

      result.push({
        ...p,
        currentMembers: memberCount,
        minSize,
        maxSize,
        displayStatus,
        canApprove: memberCount >= minSize && memberCount <= maxSize && p.status !== 'Approved' && p.status !== 'Withdrawn',
      });
    }

    return result;
  }

  async approveClassroomParticipation(classroomId: string, participationId: string, adminUserId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    if (classroom.ownerId !== adminUserId) {
      throw new AppError('Only the Classroom Admin can approve team participation', 403);
    }

    const participation = await teamRepository.findParticipationById(participationId);
    if (!participation || participation.classroomId !== classroomId) {
      throw new AppError('Team participation request not found', 404);
    }

    const team = await teamRepository.findById(participation.teamId);
    if (!team) {
      throw new AppError('Participating team not found', 404);
    }

    if (participation.status === 'Approved') {
      throw new AppError('This team has already been approved for this classroom', 400);
    }

    const minSize = classroom.minTeamSize ?? (classroom.maxTeamSize ? 2 : (team.maxSize ?? 2));
    const maxSize = classroom.maxTeamSize ?? team.maxSize ?? 20;

    // Strict validation against Classroom Minimum and Maximum Team Size
    if (team.members.length < minSize) {
      throw new AppError(
        `Cannot approve incomplete team (${team.members.length}/${minSize} Members). Classroom requires at least ${minSize} members.`,
        400
      );
    }

    if (team.members.length > maxSize) {
      throw new AppError(
        `Cannot approve team: team member count (${team.members.length}) exceeds classroom maximum size of ${maxSize}.`,
        400
      );
    }

    const updated = await teamRepository.updateParticipationStatus(participationId, 'Approved', adminUserId);

    // Auto-enroll all team members into Classroom if not already enrolled
    for (const m of team.members) {
      const alreadyMember = classroom.members.some((cm) => cm.userId === m.userId);
      if (!alreadyMember && m.userId !== classroom.ownerId) {
        await classroomRepository.addMember(classroomId, m.userId, 'MEMBER');
      }
    }

    await notificationService.notify(
      team.captainId,
      'classroom_invitation',
      'Team Participation Approved',
      `Team "${team.name}" has been approved for classroom "${classroom.name}".`,
      `/teams/${team.id}`
    );

    return updated;
  }

  async rejectClassroomParticipation(classroomId: string, participationId: string, adminUserId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }
    if (classroom.ownerId !== adminUserId) {
      throw new AppError('Only the Classroom Admin can reject team participation', 403);
    }

    const participation = await teamRepository.findParticipationById(participationId);
    if (!participation || participation.classroomId !== classroomId) {
      throw new AppError('Team participation request not found', 404);
    }

    const updated = await teamRepository.updateParticipationStatus(participationId, 'Rejected', adminUserId);

    const team = await teamRepository.findById(participation.teamId);
    if (team) {
      await notificationService.notify(
        team.captainId,
        'classroom_invitation',
        'Team Participation Rejected',
        `Team "${team.name}" participation request for classroom "${classroom.name}" was declined.`,
        `/teams/${team.id}`
      );
    }

    return updated;
  }
}

export const teamService = new TeamService();


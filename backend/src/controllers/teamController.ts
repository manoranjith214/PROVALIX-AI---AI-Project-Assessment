import { Response, NextFunction } from 'express';
import { teamService } from '../services/teamService';
import {
  createTeamSchema,
  updateTeamSchema,
  inviteMemberSchema,
  transferCaptainSchema,
  requestClassroomParticipationSchema,
} from '../validators/teamValidator';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class TeamController {
  async createTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createTeamSchema.parse(req.body);
      const team = await teamService.createTeam(req.user!.id, validated);
      return sendSuccess(res, team, 'Team created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getMyTeams(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const teams = await teamService.getUserTeams(req.user!.id);
      return sendSuccess(res, teams, 'User teams retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getMyInvitations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const invites = await teamService.getUserInvitations(req.user!.id);
      return sendSuccess(res, invites, 'User pending invitations retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getTeamById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const team = await teamService.getTeamById(req.params.id);
      return sendSuccess(res, team, 'Team retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateTeamSchema.parse(req.body);
      const team = await teamService.updateTeam(req.params.id, req.user!.id, validated);
      return sendSuccess(res, team, 'Team updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.deleteTeam(req.params.id, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async inviteMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = inviteMemberSchema.parse(req.body);
      const invite = await teamService.inviteMember(req.params.id, req.user!.id, userId);
      return sendSuccess(res, invite, 'Invitation dispatched successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async acceptInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.acceptInvite(req.params.inviteId, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async rejectInvite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.rejectInvite(req.params.inviteId, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async removeMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.removeMember(
        req.params.id,
        req.user!.id,
        req.params.userId
      );
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async leaveTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.leaveTeam(req.params.id, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async transferCaptaincy(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { newCaptainId } = transferCaptainSchema.parse(req.body);
      const team = await teamService.transferCaptaincy(
        req.params.id,
        req.user!.id,
        newCaptainId
      );
      return sendSuccess(res, team, 'Captaincy successfully transferred', 200);
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No image file was uploaded', 400);
      }
      const logoUrl = `/uploads/${req.file.filename}`;
      const result = await teamService.uploadLogo(req.params.id, req.user!.id, logoUrl);
      return sendSuccess(res, result, 'Team logo uploaded successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async archiveTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.archiveTeam(req.params.id, req.user!.id);
      return sendSuccess(res, result.team, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async deactivateTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.deactivateTeam(req.params.id, req.user!.id);
      return sendSuccess(res, result.team, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async requestClassroomParticipation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = requestClassroomParticipationSchema.parse(req.body);
      const participation = await teamService.requestClassroomParticipation(
        req.params.id,
        req.user!.id,
        validated
      );
      return sendSuccess(res, participation, 'Participation request submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getTeamClassroomParticipations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const participations = await teamService.getTeamClassroomParticipations(
        req.params.id,
        req.user!.id
      );
      return sendSuccess(res, participations, 'Team classroom participations retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async withdrawClassroomParticipation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await teamService.withdrawClassroomParticipation(
        req.params.id,
        req.params.participationId,
        req.user!.id
      );
      return sendSuccess(res, result.participation, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async getClassroomTeamParticipations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const participations = await teamService.getClassroomTeamParticipations(
        req.params.id,
        req.user!.id
      );
      return sendSuccess(res, participations, 'Classroom team participations retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async approveClassroomParticipation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const participation = await teamService.approveClassroomParticipation(
        req.params.id,
        req.params.participationId,
        req.user!.id
      );
      return sendSuccess(res, participation, 'Team approved for classroom participation', 200);
    } catch (err) {
      next(err);
    }
  }

  async rejectClassroomParticipation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const participation = await teamService.rejectClassroomParticipation(
        req.params.id,
        req.params.participationId,
        req.user!.id
      );
      return sendSuccess(res, participation, 'Team participation request rejected', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const teamController = new TeamController();

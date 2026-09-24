import { Response, NextFunction } from 'express';
import { leaderboardService } from '../services/leaderboardService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class LeaderboardController {
  async getLeaderboard(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await leaderboardService.getClassroomLeaderboard(
        req.params.id,
        req.user!.id
      );
      return sendSuccess(res, result, 'Classroom leaderboard retrieved', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const leaderboardController = new LeaderboardController();

import { Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboardService';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class DashboardController {
  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const summary = await dashboardService.getSummary(req.user!.id);
      return sendSuccess(res, summary, 'Dashboard summary retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getRecentReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const reports = await dashboardService.getRecentReports(req.user!.id);
      return sendSuccess(res, reports, 'Recent reports retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getUpcomingDeadlines(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const deadlines = await dashboardService.getUpcomingDeadlines(req.user!.id);
      return sendSuccess(res, deadlines, 'Upcoming deadlines retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getCurrentEvaluations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const evaluations = await dashboardService.getCurrentEvaluations(req.user!.id);
      return sendSuccess(res, evaluations, 'Current evaluations retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getLeaderboardPreview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const preview = await dashboardService.getLeaderboardPreview(req.user!.id);
      return sendSuccess(res, preview, 'Leaderboard preview retrieved', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const dashboardController = new DashboardController();

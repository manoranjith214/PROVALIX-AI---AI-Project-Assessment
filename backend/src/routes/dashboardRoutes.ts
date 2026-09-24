import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

router.get('/summary', (req, res, next) => dashboardController.getSummary(req, res, next));
router.get('/recent-reports', (req, res, next) => dashboardController.getRecentReports(req, res, next));
router.get('/upcoming-deadlines', (req, res, next) => dashboardController.getUpcomingDeadlines(req, res, next));
router.get('/current-evaluations', (req, res, next) => dashboardController.getCurrentEvaluations(req, res, next));
router.get('/leaderboard-preview', (req, res, next) => dashboardController.getLeaderboardPreview(req, res, next));

export default router;

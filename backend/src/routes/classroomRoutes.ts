import { Router } from 'express';
import { classroomController } from '../controllers/classroomController';
import { submissionController } from '../controllers/submissionController';
import { verificationController } from '../controllers/verificationController';
import { leaderboardController } from '../controllers/leaderboardController';
import { teamController } from '../controllers/teamController';
import { authenticate } from '../middleware/authMiddleware';
import {
  requireClassroomOwner,
  requireClassroomMember,
  requireClassroomEvaluatorOrOwner,
} from '../middleware/classroomAuthMiddleware';

const router = Router();

router.use(authenticate);

// General classroom endpoints
router.post('/', (req, res, next) => classroomController.createClassroom(req, res, next));
router.get('/', (req, res, next) => classroomController.listClassrooms(req, res, next));
router.post('/verify-code', (req, res, next) => classroomController.verifyCode(req, res, next));
router.post('/join-code', (req, res, next) => classroomController.joinByCode(req, res, next));
router.post('/:id/join', (req, res, next) => classroomController.joinByCode(req, res, next));
router.post('/:id/logo', requireClassroomOwner, (req, res, next) => classroomController.uploadLogo(req, res, next));

router.get('/:id', requireClassroomMember, (req, res, next) => classroomController.getClassroomById(req, res, next));
router.put('/:id', requireClassroomOwner, (req, res, next) => classroomController.updateClassroom(req, res, next));
router.delete('/:id', requireClassroomOwner, (req, res, next) => classroomController.deleteClassroom(req, res, next));

// Invites, Members & Evaluators
router.post('/:id/invite', requireClassroomOwner, (req, res, next) => classroomController.inviteUser(req, res, next));
router.put('/:id/members/:userId/approve', requireClassroomOwner, (req, res, next) => classroomController.approveMember(req, res, next));
router.put('/:id/members/:userId/reject', requireClassroomOwner, (req, res, next) => classroomController.rejectMember(req, res, next));
router.post('/:id/evaluators', requireClassroomOwner, (req, res, next) => classroomController.assignEvaluator(req, res, next));
router.put('/:id/evaluators/:evaluatorId', requireClassroomOwner, (req, res, next) => classroomController.assignEvaluator(req, res, next));
router.delete('/:id/evaluators/:evaluatorId', requireClassroomOwner, (req, res, next) => classroomController.removeEvaluator(req, res, next));

// Submissions under classroom
router.post('/:id/submissions', requireClassroomMember, (req, res, next) => submissionController.createSubmission(req, res, next));
router.get('/:id/submissions', requireClassroomMember, (req, res, next) => submissionController.listSubmissions(req, res, next));

// Verification & Leaderboard
router.get('/:id/verification', requireClassroomEvaluatorOrOwner, (req, res, next) => verificationController.getClassroomVerifications(req, res, next));
router.get('/:id/leaderboard', requireClassroomMember, (req, res, next) => leaderboardController.getLeaderboard(req, res, next));

// Team Participation Approval Gate
router.get('/:id/team-participations', requireClassroomMember, (req, res, next) => teamController.getClassroomTeamParticipations(req, res, next));
router.put('/:id/team-participations/:participationId/approve', requireClassroomOwner, (req, res, next) => teamController.approveClassroomParticipation(req, res, next));
router.put('/:id/team-participations/:participationId/reject', requireClassroomOwner, (req, res, next) => teamController.rejectClassroomParticipation(req, res, next));

export default router;


import { Router } from 'express';
import { teamController } from '../controllers/teamController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticate);

// Logo Upload
router.post('/upload-logo', upload.single('logo'), (req, res, next) => teamController.uploadLogo(req, res, next));
router.post('/:id/logo', upload.single('logo'), (req, res, next) => teamController.uploadLogo(req, res, next));

// General Team Endpoints
router.post('/', (req, res, next) => teamController.createTeam(req, res, next));
router.get('/', (req, res, next) => teamController.getMyTeams(req, res, next));
router.get('/invites/pending', (req, res, next) => teamController.getMyInvitations(req, res, next));
router.get('/:id', (req, res, next) => teamController.getTeamById(req, res, next));
router.put('/:id', (req, res, next) => teamController.updateTeam(req, res, next));
router.delete('/:id', (req, res, next) => teamController.deleteTeam(req, res, next));

// Archive & Deactivate
router.post('/:id/archive', (req, res, next) => teamController.archiveTeam(req, res, next));
router.post('/:id/deactivate', (req, res, next) => teamController.deactivateTeam(req, res, next));

// Invitations
router.post('/:id/invites', (req, res, next) => teamController.inviteMember(req, res, next));
router.post('/invites/:inviteId/accept', (req, res, next) => teamController.acceptInvite(req, res, next));
router.post('/invites/:inviteId/reject', (req, res, next) => teamController.rejectInvite(req, res, next));

// Membership & Captaincy
router.delete('/:id/members/:userId', (req, res, next) => teamController.removeMember(req, res, next));
router.post('/:id/leave', (req, res, next) => teamController.leaveTeam(req, res, next));
router.put('/:id/captain', (req, res, next) => teamController.transferCaptaincy(req, res, next));

// Team Classroom Participation
router.post('/:id/classrooms/request', (req, res, next) => teamController.requestClassroomParticipation(req, res, next));
router.get('/:id/classrooms', (req, res, next) => teamController.getTeamClassroomParticipations(req, res, next));
router.post('/:id/classrooms/:participationId/withdraw', (req, res, next) => teamController.withdrawClassroomParticipation(req, res, next));

export default router;


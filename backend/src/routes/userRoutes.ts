import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.get('/me', authenticate, (req, res, next) => userController.getMe(req, res, next));
router.put('/me', authenticate, (req, res, next) => userController.updateMe(req, res, next));
router.post('/me/avatar', authenticate, upload.single('avatar'), (req, res, next) => userController.uploadAvatar(req, res, next));
router.put('/me/password', authenticate, (req, res, next) => userController.updatePassword(req, res, next));
router.get('/:userId', authenticate, (req, res, next) => userController.getUserById(req, res, next));

export default router;

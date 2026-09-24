import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authRateLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', authRateLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/google', authRateLimiter, (req, res, next) => authController.googleLogin(req, res, next));
router.post('/supabase', authRateLimiter, (req, res, next) => authController.supabaseLogin(req, res, next));
router.post('/forgot-password', authRateLimiter, (req, res, next) => authController.forgotPassword(req, res, next));
router.post('/reset-password', authRateLimiter, (req, res, next) => authController.resetPassword(req, res, next));
router.post('/refresh', (req, res, next) => authController.refreshToken(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

export default router;

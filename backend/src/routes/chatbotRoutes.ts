import { Router } from 'express';
import { chatbotController } from '../controllers/chatbotController';
import { authenticate } from '../middleware/authMiddleware';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Protect all chatbot endpoints with JWT authentication and rate limiting
router.use(authenticate);
router.use(apiRateLimiter);

router.post('/message', (req, res, next) => chatbotController.sendMessage(req, res, next));
router.get('/conversations', (req, res, next) => chatbotController.getConversations(req, res, next));
router.get('/conversations/:id', (req, res, next) => chatbotController.getConversationById(req, res, next));
router.delete('/conversations/:id', (req, res, next) => chatbotController.deleteConversation(req, res, next));

export default router;

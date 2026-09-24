import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from '../config/swagger';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import teamRoutes from './teamRoutes';
import classroomRoutes from './classroomRoutes';
import submissionRoutes from './submissionRoutes';
import projectCheckerRoutes from './projectCheckerRoutes';
import notificationRoutes from './notificationRoutes';
import dashboardRoutes from './dashboardRoutes';
import chatbotRoutes from './chatbotRoutes';
import { prisma } from '../config/prisma';
import { sendSuccess, sendError } from '../utils/response';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    let dbStatus = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (dbErr: any) {
      console.error('[HealthCheck] DB query failed:', dbErr.message || dbErr);
      dbStatus = 'unavailable';
    }

    return sendSuccess(
      res,
      {
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        version: '1.0.0',
      },
      'Provalix AI API is running'
    );
  } catch (err: any) {
    return sendError(res, 'Health check failed: ' + err.message, 500);
  }
});

// Swagger Documentation UI
router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount Sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/teams', teamRoutes);
router.use('/classrooms', classroomRoutes);
router.use('/submissions', submissionRoutes);
router.use('/project-checker', projectCheckerRoutes);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/chatbot', chatbotRoutes);

export default router;

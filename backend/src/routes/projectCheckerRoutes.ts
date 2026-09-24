import { Router } from 'express';
import { projectCheckerController } from '../controllers/projectCheckerController';
import { authenticate } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.use(authenticate);

router.post('/projects', (req, res, next) => projectCheckerController.createProject(req, res, next));
router.get('/projects', (req, res, next) => projectCheckerController.listProjects(req, res, next));
router.get('/projects/:id', (req, res, next) => projectCheckerController.getProjectById(req, res, next));
router.put('/projects/:id', (req, res, next) => projectCheckerController.updateProject(req, res, next));
router.delete('/projects/:id', (req, res, next) => projectCheckerController.deleteProject(req, res, next));

// File upload resource
router.post('/projects/:id/resources', upload.single('file'), (req, res, next) =>
  projectCheckerController.uploadResource(req, res, next)
);

// Analysis & Evaluation
router.post('/projects/:id/plagiarism-check', (req, res, next) =>
  projectCheckerController.checkPlagiarism(req, res, next)
);
router.post('/projects/:id/ai-evaluate', (req, res, next) =>
  projectCheckerController.evaluateAI(req, res, next)
);

// Reports
router.post('/projects/:id/generate-report', (req, res, next) =>
  projectCheckerController.generateReport(req, res, next)
);
router.get('/projects/:id/report', (req, res, next) =>
  projectCheckerController.getReport(req, res, next)
);
router.get('/projects/:id/report/pdf', (req, res, next) =>
  projectCheckerController.getPdfReport(req, res, next)
);

export default router;

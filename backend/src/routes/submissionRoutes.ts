import { Router } from 'express';
import { submissionController } from '../controllers/submissionController';
import { evaluationController } from '../controllers/evaluationController';
import { verificationController } from '../controllers/verificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticate);

// Submission Details & Mutations
router.get('/:submissionId', (req, res, next) => submissionController.getSubmissionById(req, res, next));
router.put('/:submissionId', (req, res, next) => submissionController.updateSubmission(req, res, next));
router.delete('/:submissionId', (req, res, next) => submissionController.deleteSubmission(req, res, next));

// Classroom AI Evaluation
router.post('/:id/ai-evaluate', (req, res, next) => evaluationController.triggerAIEvaluation(req, res, next));
router.get('/:id/ai-evaluation', (req, res, next) => evaluationController.getAIEvaluation(req, res, next));

// Viva Generation, Evaluation & Results
router.post('/:id/viva/generate', (req, res, next) => evaluationController.generateVivaQuestions(req, res, next));
router.get('/:id/viva', (req, res, next) => evaluationController.getVivaQuestions(req, res, next));
router.post('/:id/viva/marks', (req, res, next) => evaluationController.submitVivaMarks(req, res, next));
router.put('/:id/viva/marks', (req, res, next) => evaluationController.submitVivaMarks(req, res, next));
router.get('/:id/viva/result', (req, res, next) => evaluationController.getVivaResult(req, res, next));

// Legacy / Direct Faculty Evaluation (PPT/Demo + Viva combined)
router.post('/:id/faculty-evaluation', (req, res, next) => evaluationController.submitFacultyEvaluation(req, res, next));

// Verification
router.post('/:id/verify', (req, res, next) => verificationController.verifySubmission(req, res, next));
router.post('/:id/return', (req, res, next) => verificationController.returnSubmission(req, res, next));

export default router;

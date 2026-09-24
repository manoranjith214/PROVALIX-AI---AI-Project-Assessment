import { Response, NextFunction } from 'express';
import { aiEvaluationService } from '../services/aiEvaluationService';
import { facultyEvaluationService } from '../services/facultyEvaluationService';
import { vivaService } from '../services/vivaService';
import { facultyEvaluationSchema } from '../validators/evaluationValidator';
import { submitVivaMarksSchema } from '../validators/vivaValidator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class EvaluationController {
  async triggerAIEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await aiEvaluationService.evaluateSubmission(req.params.id);
      return sendSuccess(res, result, 'AI evaluation completed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async getAIEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const evaluation = await aiEvaluationService.getAIEvaluation(req.params.id);
      return sendSuccess(res, evaluation, 'AI evaluation retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async generateVivaQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questions = await vivaService.generateVivaQuestions(req.params.id, req.user!);
      return sendSuccess(res, questions, 'Viva questions generated successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async getVivaQuestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const questions = await vivaService.getVivaQuestions(req.params.id, req.user!);
      return sendSuccess(res, questions, 'Viva questions retrieved successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async submitVivaMarks(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = submitVivaMarksSchema.parse(req.body);
      const result = await vivaService.submitVivaMarks(
        req.params.id,
        req.user!,
        validated
      );
      return sendSuccess(res, result, 'Viva marks recorded and final score updated', 201);
    } catch (err) {
      next(err);
    }
  }

  async getVivaResult(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await vivaService.getVivaResult(req.params.id, req.user!);
      return sendSuccess(res, result, 'Viva evaluation result retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async submitFacultyEvaluation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = facultyEvaluationSchema.parse(req.body);
      const result = await facultyEvaluationService.submitFacultyEvaluation(
        req.params.id,
        req.user!.id,
        validated as any
      );
      return sendSuccess(res, result, 'Faculty evaluation recorded and final score computed', 201);
    } catch (err) {
      next(err);
    }
  }
}

export const evaluationController = new EvaluationController();

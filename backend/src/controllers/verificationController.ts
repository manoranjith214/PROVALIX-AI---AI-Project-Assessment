import { Response, NextFunction } from 'express';
import { verificationService } from '../services/verificationService';
import { returnVerificationSchema } from '../validators/evaluationValidator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class VerificationController {
  async getClassroomVerifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const submissions = await verificationService.getClassroomVerifications(req.params.id);
      return sendSuccess(res, submissions, 'Submissions for verification retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async verifySubmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await verificationService.verifySubmission(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'Submission verified and results published', 200);
    } catch (err) {
      next(err);
    }
  }

  async returnSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = returnVerificationSchema.parse(req.body);
      const result = await verificationService.returnSubmission(
        req.params.id,
        req.user!.id,
        validated
      );
      return sendSuccess(res, result, 'Evaluation returned for revision', 200);
    } catch (err) {
      next(err);
    }
  }
}

export const verificationController = new VerificationController();

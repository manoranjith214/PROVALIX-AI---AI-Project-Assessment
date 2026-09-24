import { Response, NextFunction } from 'express';
import { submissionService } from '../services/submissionService';
import { createSubmissionSchema, updateSubmissionSchema } from '../validators/submissionValidator';
import { sendSuccess } from '../utils/response';
import { parsePagination, formatPaginationMeta } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export class SubmissionController {
  async createSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createSubmissionSchema.parse(req.body);
      const submission = await submissionService.createSubmission(
        req.params.id,
        req.user!.id,
        validated
      );
      return sendSuccess(res, submission, 'Project submitted successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async listSubmissions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { total, submissions } = await submissionService.listSubmissions(
        req.params.id,
        pagination
      );
      const meta = formatPaginationMeta(total, pagination.page, pagination.limit);
      return sendSuccess(res, submissions, 'Submissions retrieved', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getSubmissionById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const submission = await submissionService.getSubmissionById(req.params.submissionId);
      return sendSuccess(res, submission, 'Submission retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateSubmissionSchema.parse(req.body);
      const updated = await submissionService.updateSubmission(
        req.params.submissionId,
        req.user!.id,
        validated
      );
      return sendSuccess(res, updated, 'Submission updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteSubmission(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await submissionService.deleteSubmission(
        req.params.submissionId,
        req.user!.id
      );
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const submissionController = new SubmissionController();

import { Response, NextFunction } from 'express';
import { classroomService } from '../services/classroomService';
import {
  createClassroomSchema,
  updateClassroomSchema,
  inviteClassroomUserSchema,
  joinClassroomByCodeSchema,
  verifyClassroomCodeSchema,
  assignEvaluatorSchema,
} from '../validators/classroomValidator';
import { sendSuccess } from '../utils/response';
import { parsePagination, formatPaginationMeta } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorMiddleware';

export class ClassroomController {
  async createClassroom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createClassroomSchema.parse(req.body);
      const classroom = await classroomService.createClassroom(req.user!.id, validated);
      return sendSuccess(res, classroom, 'Classroom created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async listClassrooms(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { total, classrooms } = await classroomService.listClassrooms(req.user!.id, pagination);
      const meta = formatPaginationMeta(total, pagination.page, pagination.limit);
      return sendSuccess(res, classrooms, 'Classrooms retrieved', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getClassroomById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const classroom = await classroomService.getClassroomById(req.params.id);
      return sendSuccess(res, classroom, 'Classroom details retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateClassroom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateClassroomSchema.parse(req.body);
      const classroom = await classroomService.updateClassroom(req.params.id, validated);
      return sendSuccess(res, classroom, 'Classroom updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteClassroom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await classroomService.deleteClassroom(req.params.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async verifyCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { code } = verifyClassroomCodeSchema.parse(req.body);
      const result = await classroomService.verifyCode(code, req.user!.id);
      return sendSuccess(res, result, 'Classroom verified', 200);
    } catch (err) {
      next(err);
    }
  }

  async joinByCode(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { code, teamIdentifier } = joinClassroomByCodeSchema.parse(req.body);
      const result = await classroomService.joinByCode(req.user!.id, { code, teamIdentifier });
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async approveMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await classroomService.approveMember(req.params.id, req.params.userId, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async rejectMember(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await classroomService.rejectMember(req.params.id, req.params.userId, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async uploadLogo(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const logo = req.body.logo || req.body.file;
      if (!logo) {
        throw new AppError('No logo image data provided', 400);
      }
      const result = await classroomService.uploadLogo(req.params.id, logo, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async inviteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { email, role } = inviteClassroomUserSchema.parse(req.body);
      const result = await classroomService.inviteUser(req.params.id, email, role as any);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async assignEvaluator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { evaluatorId, submissionId } = assignEvaluatorSchema.parse(req.body);
      const assignment = await classroomService.assignEvaluator(
        req.params.id,
        evaluatorId,
        submissionId
      );
      return sendSuccess(res, assignment, 'Evaluator assigned successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async removeEvaluator(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await classroomService.removeEvaluator(req.params.evaluatorId);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const classroomController = new ClassroomController();


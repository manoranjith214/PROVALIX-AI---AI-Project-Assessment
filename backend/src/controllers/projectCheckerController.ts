import { Response, NextFunction } from 'express';
import { projectCheckerService } from '../services/projectCheckerService';
import {
  createProjectCheckerProjectSchema,
  updateProjectCheckerProjectSchema,
} from '../validators/projectCheckerValidator';
import { sendSuccess, sendError } from '../utils/response';
import { parsePagination, formatPaginationMeta } from '../utils/pagination';
import { AuthenticatedRequest } from '../types';

export class ProjectCheckerController {
  async createProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createProjectCheckerProjectSchema.parse(req.body);
      const project = await projectCheckerService.createProject(req.user!.id, validated);
      return sendSuccess(res, project, 'Project created for evaluation', 201);
    } catch (err) {
      next(err);
    }
  }

  async listProjects(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const pagination = parsePagination(req);
      const { total, projects } = await projectCheckerService.listUserProjects(
        req.user!.id,
        pagination
      );
      const meta = formatPaginationMeta(total, pagination.page, pagination.limit);
      return sendSuccess(res, projects, 'Projects retrieved', 200, meta);
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectCheckerService.getProjectById(req.params.id, req.user!.id);
      return sendSuccess(res, project, 'Project retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = updateProjectCheckerProjectSchema.parse(req.body);
      const updated = await projectCheckerService.updateProject(
        req.params.id,
        req.user!.id,
        validated
      );
      return sendSuccess(res, updated, 'Project updated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteProject(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await projectCheckerService.deleteProject(req.params.id, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }

  async uploadResource(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return sendError(res, 'No file was uploaded', 400);
      }
      const type = req.body.type || 'other';
      const resource = await projectCheckerService.addResource(
        req.params.id,
        req.user!.id,
        req.file,
        type
      );
      return sendSuccess(res, resource, 'Resource uploaded successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async checkPlagiarism(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await projectCheckerService.runPlagiarismCheck(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'Plagiarism check completed', 200);
    } catch (err) {
      next(err);
    }
  }

  async evaluateAI(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await projectCheckerService.runAIEvaluation(req.params.id, req.user!.id);
      return sendSuccess(res, result, 'AI evaluation out of 100 completed successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async generateReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await projectCheckerService.generateReport(req.params.id, req.user!.id);
      return sendSuccess(res, report, 'Report generated successfully', 200);
    } catch (err) {
      next(err);
    }
  }

  async getReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const report = await projectCheckerService.getReport(req.params.id, req.user!.id);
      return sendSuccess(res, report, 'Report retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getPdfReport(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { markdown, report } = await projectCheckerService.getPdfReport(
        req.params.id,
        req.user!.id
      );

      // Return both formatted markdown content and structured data for PDF/text download
      return sendSuccess(
        res,
        { markdown, report },
        'Report document ready for PDF generation/download',
        200
      );
    } catch (err) {
      next(err);
    }
  }
}

export const projectCheckerController = new ProjectCheckerController();

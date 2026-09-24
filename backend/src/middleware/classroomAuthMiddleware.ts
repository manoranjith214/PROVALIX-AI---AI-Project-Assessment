import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, RoleType } from '../types';
import { prisma } from '../config/prisma';
import { sendError } from '../utils/response';

/**
 * Middleware to enforce contextual classroom permissions.
 * Checks whether the authenticated user has one of the required roles in the specified classroom.
 */
export function requireClassroomRole(allowedRoles: RoleType[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return sendError(res, 'Authentication required.', 401);
      }

      const classroomId = req.params.id || req.params.classroomId || req.body.classroomId;
      if (!classroomId) {
        return sendError(res, 'Classroom ID is required.', 400);
      }

      // Check if user is the direct owner
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { id: true, ownerId: true },
      });

      if (!classroom) {
        return sendError(res, 'Classroom not found.', 404);
      }

      if (classroom.ownerId === req.user.id) {
        req.classroomMemberRole = 'OWNER';
        return next();
      }

      // Check membership and contextual role
      const member = await prisma.classroomMember.findUnique({
        where: {
          classroomId_userId: {
            classroomId,
            userId: req.user.id,
          },
        },
      });

      if (!member) {
        return sendError(res, 'You are not a member of this classroom.', 403);
      }

      const userRole = member.role.toUpperCase() as RoleType;
      req.classroomMemberRole = userRole;

      if (!allowedRoles.includes(userRole)) {
        return sendError(
          res,
          `Access denied. Requires one of the following classroom roles: ${allowedRoles.join(', ')}`,
          403
        );
      }

      return next();
    } catch (err: any) {
      return sendError(res, 'Error checking classroom permissions: ' + err.message, 500);
    }
  };
}

/**
 * Middleware ensuring user is the Owner of the classroom
 */
export const requireClassroomOwner = requireClassroomRole(['OWNER']);

/**
 * Middleware ensuring user is Owner or Evaluator (Faculty/Coordinator)
 */
export const requireClassroomEvaluatorOrOwner = requireClassroomRole(['OWNER', 'EVALUATOR']);

/**
 * Middleware ensuring user is any valid member of the classroom
 */
export const requireClassroomMember = requireClassroomRole(['OWNER', 'EVALUATOR', 'MEMBER']);

import { Request } from 'express';

export type RoleType = 'OWNER' | 'EVALUATOR' | 'MEMBER';

export interface AuthenticatedUserPayload {
  id: string;
  permanentId: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUserPayload;
  classroomMemberRole?: RoleType;
  classroomMemberId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

import { Request } from 'express';
import { PaginationParams } from '../types';

export function parsePagination(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const rawLimit = parseInt(req.query.limit as string, 10) || 10;
  // Enforce max limit of 100 to prevent DOS
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const search = req.query.search ? String(req.query.search).trim() : undefined;
  const sortBy = req.query.sortBy ? String(req.query.sortBy).trim() : undefined;
  const sortOrder = req.query.sortOrder === 'desc' ? 'desc' : 'asc';
  const status = req.query.status ? String(req.query.status).trim() : undefined;

  return {
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    status,
  };
}

export function formatPaginationMeta(total: number, page: number, limit: number) {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

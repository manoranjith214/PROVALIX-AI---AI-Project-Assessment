import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100),
  logo: z.string().optional(),
  maxSize: z.number().int().min(2, 'Team Max Size must be at least 2').max(20, 'Team Max Size cannot exceed 20').default(4),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').max(100).optional(),
  logo: z.string().optional(),
  maxSize: z.number().int().min(2, 'Team Max Size must be at least 2').max(20, 'Team Max Size cannot exceed 20').optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'DEACTIVATED']).optional(),
});

export const inviteMemberSchema = z.object({
  userId: z.string().min(1, 'Target User ID or permanent PRV ID is required'),
});

export const transferCaptainSchema = z.object({
  newCaptainId: z.string().min(1, 'New captain User ID or PRV ID is required'),
});

export const requestClassroomParticipationSchema = z.object({
  classroomId: z.string().optional(),
  classroomCode: z.string().optional(),
}).refine(data => data.classroomId || data.classroomCode, {
  message: 'Either classroomId or classroomCode must be provided',
});


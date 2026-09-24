import { z } from 'zod';

export const createClassroomSchema = z
  .object({
    name: z.string().min(2, 'Classroom name must be at least 2 characters').max(100),
    description: z.string().max(1000).optional(),
    logo: z.string().max(7000000).optional(),
    startDate: z.string().or(z.date()),
    deadline: z.string().or(z.date()),
    submissionMode: z.enum(['Individual', 'Team', 'INDIVIDUAL', 'TEAM']).default('Individual'),
    minTeamSize: z
      .number()
      .int('Minimum team size must be an integer')
      .min(2, 'Minimum team size must be at least 2')
      .max(20, 'Minimum team size cannot exceed 20')
      .optional()
      .default(2),
    maxTeamSize: z
      .number()
      .int('Maximum team size must be an integer')
      .min(2, 'Maximum team size must be at least 2')
      .max(20, 'Maximum team size cannot exceed 20')
      .optional()
      .default(4),
    resources: z
      .array(
        z.object({
          type: z.string(),
          label: z.string(),
          required: z.boolean().default(false),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      const mode = (data.submissionMode || '').toLowerCase();
      if (mode === 'team' && data.minTeamSize !== undefined && data.maxTeamSize !== undefined) {
        return data.minTeamSize <= data.maxTeamSize;
      }
      return true;
    },
    {
      message: 'Minimum team size must be less than or equal to maximum team size',
      path: ['minTeamSize'],
    }
  );

export const updateClassroomSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().max(1000).optional(),
    logo: z.string().max(7000000).optional().nullable(),
    startDate: z.string().or(z.date()).optional(),
    deadline: z.string().or(z.date()).optional(),
    submissionMode: z.enum(['Individual', 'Team', 'INDIVIDUAL', 'TEAM']).optional(),
    minTeamSize: z
      .number()
      .int('Minimum team size must be an integer')
      .min(2, 'Minimum team size must be at least 2')
      .max(20, 'Minimum team size cannot exceed 20')
      .optional(),
    maxTeamSize: z
      .number()
      .int('Maximum team size must be an integer')
      .min(2, 'Maximum team size must be at least 2')
      .max(20, 'Maximum team size cannot exceed 20')
      .optional(),
    resources: z
      .array(
        z.object({
          type: z.string(),
          label: z.string(),
          required: z.boolean().default(false),
        })
      )
      .optional(),
    status: z.enum(['Active', 'Archived', 'Completed']).optional(),
  })
  .refine(
    (data) => {
      if (data.minTeamSize !== undefined && data.maxTeamSize !== undefined) {
        return data.minTeamSize <= data.maxTeamSize;
      }
      return true;
    },
    {
      message: 'Minimum team size must be less than or equal to maximum team size',
      path: ['minTeamSize'],
    }
  );

export const inviteClassroomUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['EVALUATOR', 'MEMBER']).default('MEMBER'),
});

export const verifyClassroomCodeSchema = z.object({
  code: z.string().min(1, 'Classroom code is required'),
});

export const joinClassroomByCodeSchema = z.object({
  code: z.string().min(1, 'Classroom code is required'),
  teamIdentifier: z.string().optional(),
});

export const assignEvaluatorSchema = z.object({
  evaluatorId: z.string().min(1, 'Evaluator User ID or PRV ID is required'),
  submissionId: z.string().optional(),
});

export const reviewMemberSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
});


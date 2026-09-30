import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().optional(),
  projectId: z.string().optional(),
  submissionId: z.string().optional(),
  context: z
    .object({
      projectId: z.string().optional(),
      classroomId: z.string().optional(),
      submissionId: z.string().optional(),
    })
    .optional(),
  isRetry: z.boolean().optional(),
});


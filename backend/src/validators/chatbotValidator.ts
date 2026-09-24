import { z } from 'zod';

export const sendMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  submissionId: z.string().uuid().optional(),
});

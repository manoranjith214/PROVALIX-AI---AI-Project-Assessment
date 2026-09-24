import { z } from 'zod';

export const vivaQuestionScoreSchema = z.object({
  questionNumber: z.number().int().min(1).max(5),
  questionText: z.string(),
  score: z.number().min(0).max(5),
  feedback: z.string().optional(),
});

export const facultyEvaluationSchema = z
  .object({
    pptDemoScore: z.number().min(0).max(25, 'PPT + Demo score cannot exceed 25'),
    vivaQuestions: z.array(vivaQuestionScoreSchema).length(5, 'Viva must contain exactly 5 question evaluations'),
    status: z.enum(['Completed', 'Incomplete', 'Absent']),
    reason: z.string().optional(),
    feedback: z.string().min(3, 'Feedback is mandatory'),
  })
  .superRefine((data, ctx) => {
    if ((data.status === 'Incomplete' || data.status === 'Absent') && (!data.reason || data.reason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is mandatory when evaluation status is Incomplete or Absent',
        path: ['reason'],
      });
    }
  });

export const returnVerificationSchema = z.object({
  reason: z.string().min(5, 'Return reason is required'),
  feedback: z.string().min(5, 'Constructive return feedback is required'),
});

import { z } from 'zod';

export const vivaQuestionMarkSchema = z.object({
  questionNumber: z.number().int().min(1).max(5),
  questionText: z.string().min(3, 'Question text is required'),
  category: z.string().optional(),
  score: z.number().min(0, 'Score cannot be negative').max(5, 'Score cannot exceed 5 marks per question'),
  feedback: z.string().optional(),
});

export const submitVivaMarksSchema = z
  .object({
    pptDemoScore: z.number().min(0).max(25, 'PPT + Demo score cannot exceed 25').optional(),
    vivaQuestions: z.array(vivaQuestionMarkSchema).length(5, 'Viva evaluation must contain exactly 5 questions'),
    status: z.enum(['Completed', 'Incomplete', 'Absent']).default('Completed'),
    reason: z.string().optional(),
    feedback: z.string().min(1, 'Evaluation feedback is required'),
  })
  .superRefine((data, ctx) => {
    // Check total viva score
    const totalViva = data.vivaQuestions.reduce((sum, q) => sum + q.score, 0);
    if (totalViva > 25) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total viva score cannot exceed 25 marks. Current sum is ${totalViva}`,
        path: ['vivaQuestions'],
      });
    }

    // Require reason if Incomplete or Absent
    if ((data.status === 'Incomplete' || data.status === 'Absent') && (!data.reason || data.reason.trim().length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason is mandatory when viva evaluation status is Incomplete or Absent',
        path: ['reason'],
      });
    }
  });

export type SubmitVivaMarksInput = z.infer<typeof submitVivaMarksSchema>;
export type VivaQuestionMarkInput = z.infer<typeof vivaQuestionMarkSchema>;

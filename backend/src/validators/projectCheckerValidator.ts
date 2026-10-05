import { z } from 'zod';
import { validateMeaningfulText } from './inputValidationUtils';

function createMeaningfulField(fieldName: string, minLength: number, maxLength: number = 5000, isOptional: boolean = false) {
  const schema = z.string();
  if (isOptional) {
    return schema
      .optional()
      .superRefine((val, ctx) => {
        if (!val || val.trim().length === 0) return;
        const res = validateMeaningfulText(val, minLength, fieldName, maxLength);
        if (!res.isValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: res.error || `Please provide a meaningful ${fieldName.toLowerCase()}.`,
          });
        }
      });
  }
  return schema
    .superRefine((val, ctx) => {
      const res = validateMeaningfulText(val, minLength, fieldName, maxLength);
      if (!res.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || `Please provide a meaningful ${fieldName.toLowerCase()}.`,
        });
      }
    });
}

export const createProjectCheckerProjectSchema = z
  .object({
    id: z.string().uuid().optional(),
    draftId: z.string().uuid().optional(),
    title: createMeaningfulField('Project Title', 5, 200, false),
    category: createMeaningfulField('Category / Domain', 3, 100, true),
    targetUsers: createMeaningfulField('Target Users', 5, 200, true),
    description: createMeaningfulField('Description / Abstract', 30, 5000, false),
    problemStatement: createMeaningfulField('Problem Statement', 30, 5000, true),
    proposedSolution: createMeaningfulField('Proposed Solution / Architecture', 30, 5000, true),

    // Optional enrichment fields
    objectives: z.string().optional(),
    innovation: z.string().optional(),
    features: z.string().optional(),
    technologies: z.array(z.string()).optional(),
    programmingLanguages: z.array(z.string()).optional(),
    testingApproach: z.string().optional(),
    limitations: z.string().optional(),
    futureEnhancements: z.string().optional(),
    githubUrl: z.string().url().or(z.literal('')).optional(),
    liveDemoUrl: z.string().url().or(z.literal('')).optional(),
    externalLinks: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    const desc = data.description?.trim().toLowerCase();
    const prob = data.problemStatement?.trim().toLowerCase();
    const sol = data.proposedSolution?.trim().toLowerCase();

    if (desc && prob && desc === prob) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['problemStatement'],
        message: 'Problem statement cannot be an identical copy of the project description.',
      });
    }
    if (prob && sol && prob === sol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedSolution'],
        message: 'Proposed solution cannot be an identical copy of the problem statement.',
      });
    }
    if (desc && sol && desc === sol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['proposedSolution'],
        message: 'Proposed solution cannot be an identical copy of the project description.',
      });
    }
  });

export const updateProjectCheckerProjectSchema = z.object({
  id: z.string().uuid().optional(),
  draftId: z.string().uuid().optional(),
  title: createMeaningfulField('Project Title', 5, 200, true),
  category: createMeaningfulField('Category / Domain', 3, 100, true),
  targetUsers: createMeaningfulField('Target Users', 5, 200, true),
  description: createMeaningfulField('Description / Abstract', 30, 5000, true),
  problemStatement: createMeaningfulField('Problem Statement', 30, 5000, true),
  proposedSolution: createMeaningfulField('Proposed Solution / Architecture', 30, 5000, true),
  objectives: z.string().optional(),
  innovation: z.string().optional(),
  features: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  programmingLanguages: z.array(z.string()).optional(),
  testingApproach: z.string().optional(),
  limitations: z.string().optional(),
  futureEnhancements: z.string().optional(),
  githubUrl: z.string().url().or(z.literal('')).optional(),
  liveDemoUrl: z.string().url().or(z.literal('')).optional(),
  externalLinks: z.array(z.string()).optional(),
});

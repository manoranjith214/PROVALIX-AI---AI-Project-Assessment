import { z } from 'zod';
import { validateMeaningfulText } from './inputValidationUtils';

function createMeaningfulField(
  fieldName: string,
  minLength: number,
  maxLength: number = 5000,
  isOptional: boolean = false
) {
  if (isOptional) {
    return z
      .string()
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

  return z
    .string({ required_error: `${fieldName} is required.` })
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

const urlField = (fieldName: string) =>
  z
    .string()
    .optional()
    .transform((val) => (val ? val.trim() : ''))
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: `${fieldName} must start with http:// or https:// (e.g. https://example.com)`,
    });

export const createProjectCheckerProjectSchema = z
  .object({
    id: z.string().optional(),
    draftId: z.string().optional(),
    title: createMeaningfulField('Project Title', 5, 200, false),
    category: createMeaningfulField('Category / Domain', 3, 100, false),
    targetUsers: createMeaningfulField('Target Users', 5, 200, false),
    description: createMeaningfulField('Description / Abstract', 30, 5000, false),
    problemStatement: createMeaningfulField('Problem Statement', 30, 5000, false),
    proposedSolution: createMeaningfulField('Proposed Solution / Architecture', 30, 5000, false),

    // Optional enrichment fields
    objectives: z.string().max(5000).optional().default(''),
    innovation: z.string().max(5000).optional().default(''),
    features: z.string().max(5000).optional().default(''),
    technologies: z.array(z.string()).optional().default([]),
    programmingLanguages: z.array(z.string()).optional().default([]),
    testingApproach: z.string().max(5000).optional().default(''),
    limitations: z.string().max(5000).optional().default(''),
    futureEnhancements: z.string().max(5000).optional().default(''),
    githubUrl: urlField('GitHub Repository URL'),
    liveDemoUrl: urlField('Live Demo URL'),
    externalLinks: z.array(z.string()).optional().default([]),
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

export const updateProjectCheckerProjectSchema = z
  .object({
    id: z.string().optional(),
    draftId: z.string().optional(),
    title: createMeaningfulField('Project Title', 5, 200, true),
    category: createMeaningfulField('Category / Domain', 3, 100, true),
    targetUsers: createMeaningfulField('Target Users', 5, 200, true),
    description: createMeaningfulField('Description / Abstract', 30, 5000, true),
    problemStatement: createMeaningfulField('Problem Statement', 30, 5000, true),
    proposedSolution: createMeaningfulField('Proposed Solution / Architecture', 30, 5000, true),
    objectives: z.string().max(5000).optional(),
    innovation: z.string().max(5000).optional(),
    features: z.string().max(5000).optional(),
    technologies: z.array(z.string()).optional(),
    programmingLanguages: z.array(z.string()).optional(),
    testingApproach: z.string().max(5000).optional(),
    limitations: z.string().max(5000).optional(),
    futureEnhancements: z.string().max(5000).optional(),
    githubUrl: urlField('GitHub Repository URL'),
    liveDemoUrl: urlField('Live Demo URL'),
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

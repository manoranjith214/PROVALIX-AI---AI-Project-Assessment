import { z } from 'zod';

export const createSubmissionSchema = z.object({
  title: z.string().min(2, 'Project title is required').max(200),
  category: z.string().optional(),
  description: z.string().optional(),
  problemStatement: z.string().optional(),
  proposedSolution: z.string().optional(),
  objectives: z.string().optional(),
  innovation: z.string().optional(),
  features: z.string().optional(),
  targetUsers: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  programmingLanguages: z.array(z.string()).optional(),
  testingApproach: z.string().optional(),
  limitations: z.string().optional(),
  futureEnhancements: z.string().optional(),
  githubUrl: z.string().url().or(z.literal('')).optional(),
  liveDemoUrl: z.string().url().or(z.literal('')).optional(),
  teamId: z.string().optional(),
  resources: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        url: z.string().optional(),
        size: z.string().optional(),
        status: z.string().default('uploaded'),
      })
    )
    .optional(),
});

export const updateSubmissionSchema = createSubmissionSchema.partial();

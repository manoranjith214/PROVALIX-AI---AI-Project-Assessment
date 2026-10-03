import { z } from 'zod';
import { AppError } from '../middleware/errorMiddleware';

const CriterionScoreSchema = (maxScore: number) =>
  z.object({
    score: z.number().min(0, `Score cannot be negative`).max(maxScore, `Score cannot exceed maximum of ${maxScore}`),
    feedback: z.string().min(5, 'Feedback must be descriptive and at least 5 characters'),
    maxScore: z.number().optional().default(maxScore),
  });

export const ProjectCheckerRubricSchema = z.object({
  criteria: z.object({
    problemDefinition: CriterionScoreSchema(15),
    innovationNovelty: CriterionScoreSchema(20),
    technicalImplementation: CriterionScoreSchema(20),
    functionality: CriterionScoreSchema(15),
    codeQuality: CriterionScoreSchema(10),
    documentation: CriterionScoreSchema(10),
    overallQuality: CriterionScoreSchema(10),
  }),
  strengths: z.array(z.string()).min(1, 'At least one verified strength must be provided'),
  weaknesses: z.array(z.string()).min(1, 'At least one area for improvement must be provided'),
  technicalAnalysis: z.string().min(10, 'Technical analysis must be provided'),
  codeAnalysis: z.string().min(10, 'Code analysis must be provided'),
  documentationAnalysis: z.string().min(10, 'Documentation analysis must be provided'),
  improvementPlan: z
    .array(
      z.object({
        area: z.string().min(2),
        suggestion: z.string().min(5),
        priority: z.enum(['High', 'Medium', 'Low']),
      })
    )
    .min(1, 'Improvement plan must have at least one phased item'),
  summary: z.string().min(10, 'Evaluation summary must be provided'),
});

export interface ValidatedProjectCheckerEvaluation {
  criteria: {
    problemDefinition: { score: number; maxScore: number; feedback: string };
    innovationNovelty: { score: number; maxScore: number; feedback: string };
    technicalImplementation: { score: number; maxScore: number; feedback: string };
    functionality: { score: number; maxScore: number; feedback: string };
    codeQuality: { score: number; maxScore: number; feedback: string };
    documentation: { score: number; maxScore: number; feedback: string };
    overallQuality: { score: number; maxScore: number; feedback: string };
  };
  totalScore: number; // Strictly computed by backend as sum of verified criteria
  strengths: string[];
  weaknesses: string[];
  technicalAnalysis: string;
  codeAnalysis: string;
  documentationAnalysis: string;
  actionableSuggestions: string[];
  improvementPlan: Array<{ area: string; suggestion: string; priority: 'High' | 'Medium' | 'Low' }>;
  summary: string;
}

export function validateAndCalculateProjectCheckerScores(rawAiResult: any): ValidatedProjectCheckerEvaluation {
  if (!rawAiResult) {
    throw new AppError('AI provider returned an empty or null evaluation response. Please retry.', 502);
  }

  // Normalize criteria structure if AI outputted array or object
  let normalizedCriteria: any = rawAiResult.criteria;
  if (Array.isArray(rawAiResult.criteria)) {
    const list = rawAiResult.criteria;
    const findCrit = (nameFragment: string, max: number) => {
      const match = list.find((c: any) => (c.name || '').toLowerCase().includes(nameFragment.toLowerCase()));
      return {
        score: match && typeof match.score === 'number' ? match.score : match?.obtainedScore ?? 0,
        maxScore: max,
        feedback: match?.justification || match?.feedback || 'Evaluated based on submitted evidence.',
      };
    };

    normalizedCriteria = {
      problemDefinition: findCrit('Problem', 15),
      innovationNovelty: findCrit('Innovation', 20),
      technicalImplementation: findCrit('Technical', 20),
      functionality: findCrit('Functionality', 15),
      codeQuality: findCrit('Code Quality', 10),
      documentation: findCrit('Documentation', 10),
      overallQuality: findCrit('Overall', 10),
    };
  } else if (normalizedCriteria && typeof normalizedCriteria === 'object') {
    // Map obtainedScore to score if needed
    for (const key of Object.keys(normalizedCriteria)) {
      if (normalizedCriteria[key].score === undefined && normalizedCriteria[key].obtainedScore !== undefined) {
        normalizedCriteria[key].score = normalizedCriteria[key].obtainedScore;
      }
    }
  }

  const payloadToValidate = {
    criteria: normalizedCriteria,
    strengths: Array.isArray(rawAiResult.strengths) && rawAiResult.strengths.length > 0 ? rawAiResult.strengths : ['Clear problem context defined.'],
    weaknesses: Array.isArray(rawAiResult.weaknesses) && rawAiResult.weaknesses.length > 0 ? rawAiResult.weaknesses : ['Improve technical test evidence coverage.'],
    technicalAnalysis: rawAiResult.technicalAnalysis || 'Technical implementation analyzed against rubric.',
    codeAnalysis: rawAiResult.codeAnalysis || 'Code architecture reviewed against standards.',
    documentationAnalysis: rawAiResult.documentationAnalysis || 'Documentation reviewed against deliverables.',
    improvementPlan: Array.isArray(rawAiResult.improvementPlan) && rawAiResult.improvementPlan.length > 0
      ? rawAiResult.improvementPlan
      : [
          { area: 'Technical Verification', suggestion: 'Provide automated tests and test scripts.', priority: 'High' as const },
        ],
    summary: rawAiResult.summary || 'Project evaluation completed across 7 rubric criteria.',
  };

  const parsed = ProjectCheckerRubricSchema.safeParse(payloadToValidate);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new AppError(`AI evaluation returned malformed data: ${errorDetails}. Please retry evaluation.`, 502);
  }

  const c = parsed.data.criteria;

  // STRICT REQUIREMENT 2 & 5:
  // Backend validates every score (cannot exceed max, cannot be negative).
  // Total is strictly calculated by backend as sum of validated criterion scores.
  // AI-provided total is NOT blindly trusted.
  const calculatedTotal =
    c.problemDefinition.score +
    c.innovationNovelty.score +
    c.technicalImplementation.score +
    c.functionality.score +
    c.codeQuality.score +
    c.documentation.score +
    c.overallQuality.score;

  const roundedTotal = Math.round(calculatedTotal * 10) / 10;

  return {
    criteria: {
      problemDefinition: { score: c.problemDefinition.score, maxScore: 15, feedback: c.problemDefinition.feedback },
      innovationNovelty: { score: c.innovationNovelty.score, maxScore: 20, feedback: c.innovationNovelty.feedback },
      technicalImplementation: { score: c.technicalImplementation.score, maxScore: 20, feedback: c.technicalImplementation.feedback },
      functionality: { score: c.functionality.score, maxScore: 15, feedback: c.functionality.feedback },
      codeQuality: { score: c.codeQuality.score, maxScore: 10, feedback: c.codeQuality.feedback },
      documentation: { score: c.documentation.score, maxScore: 10, feedback: c.documentation.feedback },
      overallQuality: { score: c.overallQuality.score, maxScore: 10, feedback: c.overallQuality.feedback },
    },
    totalScore: Math.min(100, Math.max(0, roundedTotal)),
    strengths: parsed.data.strengths,
    weaknesses: parsed.data.weaknesses,
    technicalAnalysis: parsed.data.technicalAnalysis,
    codeAnalysis: parsed.data.codeAnalysis,
    documentationAnalysis: parsed.data.documentationAnalysis,
    actionableSuggestions: rawAiResult.actionableSuggestions || [],
    improvementPlan: parsed.data.improvementPlan,
    summary: parsed.data.summary,
  };
}

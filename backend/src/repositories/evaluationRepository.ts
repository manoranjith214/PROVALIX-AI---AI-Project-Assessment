import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';

export class EvaluationRepository {
  async findAIEvaluationBySubmissionId(submissionId: string) {
    return prisma.classroomAIEvaluation.findUnique({
      where: { submissionId },
    });
  }

  async upsertAIEvaluation(data: {
    submissionId: string;
    rawScore: number;
    codeSimilarity: number;
    reportSimilarity: number;
    overallSimilarity: number;
    deduction: number;
    finalScore: number;
    plagiarismStatus: string;
    plagiarismReason?: string;
    matchedSources?: string[];
    feedback: string;
    improvementPlan?: any[];
    isDemoData?: boolean;
  }) {
    return prisma.classroomAIEvaluation.upsert({
      where: { submissionId: data.submissionId },
      update: {
        rawScore: data.rawScore,
        codeSimilarity: data.codeSimilarity,
        reportSimilarity: data.reportSimilarity,
        overallSimilarity: data.overallSimilarity,
        deduction: data.deduction,
        finalScore: data.finalScore,
        plagiarismStatus: data.plagiarismStatus,
        plagiarismReason: data.plagiarismReason,
        matchedSources: data.matchedSources ? JSON.stringify(data.matchedSources) : undefined,
        feedback: data.feedback,
        improvementPlan: data.improvementPlan ? JSON.stringify(data.improvementPlan) : undefined,
        isDemoData: data.isDemoData ?? false,
      },
      create: {
        submissionId: data.submissionId,
        rawScore: data.rawScore,
        codeSimilarity: data.codeSimilarity,
        reportSimilarity: data.reportSimilarity,
        overallSimilarity: data.overallSimilarity,
        deduction: data.deduction,
        finalScore: data.finalScore,
        plagiarismStatus: data.plagiarismStatus,
        plagiarismReason: data.plagiarismReason,
        matchedSources: data.matchedSources ? JSON.stringify(data.matchedSources) : undefined,
        feedback: data.feedback,
        improvementPlan: data.improvementPlan ? JSON.stringify(data.improvementPlan) : undefined,
        isDemoData: data.isDemoData ?? false,
      },
    });
  }

  async findFacultyEvaluationBySubmissionId(submissionId: string) {
    return prisma.facultyEvaluation.findUnique({
      where: { submissionId },
      include: {
        evaluator: { select: safeUserSelect },
        vivaResponses: { orderBy: { questionNumber: 'asc' } },
      },
    });
  }

  async saveFacultyEvaluation(data: {
    submissionId: string;
    evaluatorId: string;
    pptDemoScore: number;
    vivaTotalScore: number;
    totalFacultyScore: number;
    status: string;
    reason?: string;
    feedback: string;
    vivaQuestions: Array<{
      questionNumber: number;
      questionText: string;
      score: number;
      feedback?: string;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // Upsert faculty evaluation record
      const facultyEval = await tx.facultyEvaluation.upsert({
        where: { submissionId: data.submissionId },
        update: {
          evaluatorId: data.evaluatorId,
          pptDemoScore: data.pptDemoScore,
          vivaTotalScore: data.vivaTotalScore,
          totalFacultyScore: data.totalFacultyScore,
          status: data.status,
          reason: data.reason,
          feedback: data.feedback,
          evaluatedAt: new Date(),
        },
        create: {
          submissionId: data.submissionId,
          evaluatorId: data.evaluatorId,
          pptDemoScore: data.pptDemoScore,
          vivaTotalScore: data.vivaTotalScore,
          totalFacultyScore: data.totalFacultyScore,
          status: data.status,
          reason: data.reason,
          feedback: data.feedback,
        },
      });

      // Delete existing viva responses and re-insert the 5 viva questions
      await tx.vivaQuestionResponse.deleteMany({
        where: { facultyEvaluationId: facultyEval.id },
      });

      await tx.vivaQuestionResponse.createMany({
        data: data.vivaQuestions.map((q) => ({
          facultyEvaluationId: facultyEval.id,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          category: (q as any).category || null,
          maxScore: 5.0,
          score: q.score,
          feedback: q.feedback,
        })),
      });

      return tx.facultyEvaluation.findUnique({
        where: { id: facultyEval.id },
        include: {
          evaluator: { select: safeUserSelect },
          vivaResponses: { orderBy: { questionNumber: 'asc' } },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }

  async saveGeneratedVivaQuestions(
    submissionId: string,
    questions: Array<{
      questionNumber: number;
      questionText: string;
      category: string;
      maxScore?: number;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.vivaQuestion.deleteMany({
        where: { submissionId },
      });

      await tx.vivaQuestion.createMany({
        data: questions.map((q) => ({
          submissionId,
          questionNumber: q.questionNumber,
          questionText: q.questionText,
          category: q.category,
          maxScore: q.maxScore ?? 5.0,
        })),
      });

      return tx.vivaQuestion.findMany({
        where: { submissionId },
        orderBy: { questionNumber: 'asc' },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }

  async getGeneratedVivaQuestions(submissionId: string) {
    return prisma.vivaQuestion.findMany({
      where: { submissionId },
      orderBy: { questionNumber: 'asc' },
    });
  }

  async upsertVerification(data: {
    submissionId: string;
    verifiedById: string;
    status: string;
    returnReason?: string;
    feedback?: string;
  }) {
    return prisma.verification.upsert({
      where: { submissionId: data.submissionId },
      update: {
        verifiedById: data.verifiedById,
        status: data.status,
        returnReason: data.returnReason,
        feedback: data.feedback,
        verifiedAt: new Date(),
      },
      create: {
        submissionId: data.submissionId,
        verifiedById: data.verifiedById,
        status: data.status,
        returnReason: data.returnReason,
        feedback: data.feedback,
      },
      include: {
        verifiedBy: { select: safeUserSelect },
      },
    });
  }

  async getLeaderboardData(classroomId: string) {
    // Only fetch submissions that have APPROVED verification
    return prisma.submission.findMany({
      where: {
        classroomId,
        verification: {
          status: 'Approved',
        },
        finalTotalScore: { not: null },
      },
      orderBy: { finalTotalScore: 'desc' },
      select: {
        id: true,
        title: true,
        finalTotalScore: true,
        submitterId: true,
        submitter: { select: safeUserSelect },
        teamId: true,
        team: {
          select: {
            id: true,
            name: true,
            code: true,
            logo: true,
            members: {
              select: { userId: true },
            },
          },
        },
        aiEvaluation: {
          select: {
            rawScore: true,
            finalScore: true,
            deduction: true,
            feedback: true,
            improvementPlan: true,
          },
        },
        facultyEvaluation: {
          select: {
            pptDemoScore: true,
            vivaTotalScore: true,
            totalFacultyScore: true,
            status: true,
            feedback: true,
          },
        },
      },
    });
  }
}

export const evaluationRepository = new EvaluationRepository();

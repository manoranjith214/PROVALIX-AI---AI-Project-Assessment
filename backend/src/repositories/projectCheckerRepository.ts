import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';
import { PaginationParams } from '../types';

export class ProjectCheckerRepository {
  async findById(id: string) {
    return prisma.projectCheckerProject.findUnique({
      where: { id },
      include: {
        user: { select: safeUserSelect },
        resources: true,
        aiEvaluation: true,
        plagiarism: true,
      },
    });
  }

  async listByUser(userId: string, params: PaginationParams) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      ...(params.status ? { status: params.status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    let orderBy: any = { createdAt: 'desc' };
    if (params.sortBy) {
      if (['title', 'createdAt', 'updatedAt', 'status'].includes(params.sortBy)) {
        orderBy = { [params.sortBy]: params.sortOrder || 'desc' };
      }
    }

    const [total, projects] = await Promise.all([
      prisma.projectCheckerProject.count({ where }),
      prisma.projectCheckerProject.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          resources: true,
          aiEvaluation: {
            select: {
              totalScore: true,
              evaluatedAt: true,
            },
          },
          plagiarism: {
            select: {
              overallSimilarity: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return { total, projects };
  }

  async create(data: any) {
    return prisma.projectCheckerProject.create({
      data: {
        userId: data.userId,
        title: data.title,
        category: data.category,
        description: data.description,
        problemStatement: data.problemStatement,
        proposedSolution: data.proposedSolution,
        objectives: data.objectives,
        innovation: data.innovation,
        features: data.features,
        targetUsers: data.targetUsers,
        technologies: data.technologies ? JSON.stringify(data.technologies) : undefined,
        programmingLanguages: data.programmingLanguages ? JSON.stringify(data.programmingLanguages) : undefined,
        testingApproach: data.testingApproach,
        limitations: data.limitations,
        futureEnhancements: data.futureEnhancements,
        githubUrl: data.githubUrl,
        liveDemoUrl: data.liveDemoUrl,
        externalLinks: data.externalLinks ? JSON.stringify(data.externalLinks) : undefined,
      },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.projectCheckerProject.update({
      where: { id },
      data: {
        title: data.title,
        category: data.category,
        description: data.description,
        problemStatement: data.problemStatement,
        proposedSolution: data.proposedSolution,
        objectives: data.objectives,
        innovation: data.innovation,
        features: data.features,
        targetUsers: data.targetUsers,
        technologies: data.technologies ? JSON.stringify(data.technologies) : undefined,
        programmingLanguages: data.programmingLanguages ? JSON.stringify(data.programmingLanguages) : undefined,
        testingApproach: data.testingApproach,
        limitations: data.limitations,
        futureEnhancements: data.futureEnhancements,
        githubUrl: data.githubUrl,
        liveDemoUrl: data.liveDemoUrl,
        externalLinks: data.externalLinks ? JSON.stringify(data.externalLinks) : undefined,
      },
    });
  }

  async delete(id: string) {
    return prisma.projectCheckerProject.delete({
      where: { id },
    });
  }

  async addResource(data: {
    projectId: string;
    type: string;
    name: string;
    url?: string;
    path?: string;
    size?: string;
    uploadedById: string;
  }) {
    return prisma.projectCheckerResource.create({
      data,
    });
  }

  async upsertPlagiarism(data: {
    projectId: string;
    codeSimilarity: number;
    reportSimilarity: number;
    overallSimilarity: number;
    status: string;
    matchedSources?: string[];
    deduction?: number;
    reason?: string;
    feedback?: string;
    isDemoData?: boolean;
  }) {
    return prisma.projectCheckerPlagiarism.upsert({
      where: { projectId: data.projectId },
      update: {
        codeSimilarity: data.codeSimilarity,
        reportSimilarity: data.reportSimilarity,
        overallSimilarity: data.overallSimilarity,
        status: data.status,
        matchedSources: data.matchedSources ? JSON.stringify(data.matchedSources) : undefined,
        deduction: data.deduction ?? 0,
        reason: data.reason,
        feedback: data.feedback,
        isDemoData: data.isDemoData ?? false,
        checkedAt: new Date(),
      },
      create: {
        projectId: data.projectId,
        codeSimilarity: data.codeSimilarity,
        reportSimilarity: data.reportSimilarity,
        overallSimilarity: data.overallSimilarity,
        status: data.status,
        matchedSources: data.matchedSources ? JSON.stringify(data.matchedSources) : undefined,
        deduction: data.deduction ?? 0,
        reason: data.reason,
        feedback: data.feedback,
        isDemoData: data.isDemoData ?? false,
      },
    });
  }

  async upsertAIEvaluation(data: {
    projectId: string;
    problemDefinitionScore: number;
    problemDefinitionFeedback?: string;
    innovationNoveltyScore: number;
    innovationNoveltyFeedback?: string;
    technicalImplementationScore: number;
    technicalImplementationFeedback?: string;
    functionalityScore: number;
    functionalityFeedback?: string;
    codeQualityScore: number;
    codeQualityFeedback?: string;
    documentationScore: number;
    documentationFeedback?: string;
    overallQualityScore: number;
    overallQualityFeedback?: string;
    totalScore: number;
    strengths: string[];
    weaknesses: string[];
    technicalAnalysis: string;
    codeAnalysis: string;
    documentationAnalysis: string;
    actionableSuggestions?: string[];
    improvementPlan: any[];
    summary?: string;
    aiModel: string;
    isDemoData?: boolean;
  }) {
    return prisma.projectCheckerAIEvaluation.upsert({
      where: { projectId: data.projectId },
      update: {
        problemDefinitionScore: data.problemDefinitionScore,
        problemDefinitionFeedback: data.problemDefinitionFeedback,
        innovationNoveltyScore: data.innovationNoveltyScore,
        innovationNoveltyFeedback: data.innovationNoveltyFeedback,
        technicalImplementationScore: data.technicalImplementationScore,
        technicalImplementationFeedback: data.technicalImplementationFeedback,
        functionalityScore: data.functionalityScore,
        functionalityFeedback: data.functionalityFeedback,
        codeQualityScore: data.codeQualityScore,
        codeQualityFeedback: data.codeQualityFeedback,
        documentationScore: data.documentationScore,
        documentationFeedback: data.documentationFeedback,
        overallQualityScore: data.overallQualityScore,
        overallQualityFeedback: data.overallQualityFeedback,
        totalScore: data.totalScore,
        strengths: JSON.stringify(data.strengths),
        weaknesses: JSON.stringify(data.weaknesses),
        technicalAnalysis: data.technicalAnalysis,
        codeAnalysis: data.codeAnalysis,
        documentationAnalysis: data.documentationAnalysis,
        actionableSuggestions: data.actionableSuggestions ? JSON.stringify(data.actionableSuggestions) : undefined,
        improvementPlan: JSON.stringify(data.improvementPlan),
        summary: data.summary,
        aiModel: data.aiModel,
        isDemoData: data.isDemoData ?? false,
        evaluatedAt: new Date(),
      },
      create: {
        projectId: data.projectId,
        problemDefinitionScore: data.problemDefinitionScore,
        problemDefinitionFeedback: data.problemDefinitionFeedback,
        innovationNoveltyScore: data.innovationNoveltyScore,
        innovationNoveltyFeedback: data.innovationNoveltyFeedback,
        technicalImplementationScore: data.technicalImplementationScore,
        technicalImplementationFeedback: data.technicalImplementationFeedback,
        functionalityScore: data.functionalityScore,
        functionalityFeedback: data.functionalityFeedback,
        codeQualityScore: data.codeQualityScore,
        codeQualityFeedback: data.codeQualityFeedback,
        documentationScore: data.documentationScore,
        documentationFeedback: data.documentationFeedback,
        overallQualityScore: data.overallQualityScore,
        overallQualityFeedback: data.overallQualityFeedback,
        totalScore: data.totalScore,
        strengths: JSON.stringify(data.strengths),
        weaknesses: JSON.stringify(data.weaknesses),
        technicalAnalysis: data.technicalAnalysis,
        codeAnalysis: data.codeAnalysis,
        documentationAnalysis: data.documentationAnalysis,
        actionableSuggestions: data.actionableSuggestions ? JSON.stringify(data.actionableSuggestions) : undefined,
        improvementPlan: JSON.stringify(data.improvementPlan),
        summary: data.summary,
        aiModel: data.aiModel,
        isDemoData: data.isDemoData ?? false,
      },
    });
  }
}

export const projectCheckerRepository = new ProjectCheckerRepository();

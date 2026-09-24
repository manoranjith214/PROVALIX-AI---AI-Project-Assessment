import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';
import { PaginationParams } from '../types';

export class SubmissionRepository {
  async findById(id: string) {
    return prisma.submission.findUnique({
      where: { id },
      include: {
        classroom: {
          include: {
            evaluators: true,
          },
        },
        submitter: { select: safeUserSelect },
        team: {
          include: {
            captain: { select: safeUserSelect },
            members: {
              include: { user: { select: safeUserSelect } },
            },
          },
        },
        assignedEvaluator: { select: safeUserSelect },
        resources: true,
        vivaQuestions: { orderBy: { questionNumber: 'asc' } },
        aiEvaluation: true,
        facultyEvaluation: {
          include: {
            evaluator: { select: safeUserSelect },
            vivaResponses: { orderBy: { questionNumber: 'asc' } },
          },
        },
        verification: {
          include: {
            verifiedBy: { select: safeUserSelect },
          },
        },
      },
    });
  }

  async listByClassroom(classroomId: string, params: PaginationParams) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      classroomId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { submitter: { name: { contains: search, mode: 'insensitive' } } },
              { team: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [total, submissions] = await Promise.all([
      prisma.submission.count({ where }),
      prisma.submission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          submitter: { select: safeUserSelect },
          team: {
            select: { id: true, name: true, code: true },
          },
          assignedEvaluator: { select: safeUserSelect },
          verification: true,
          aiEvaluation: {
            select: {
              rawScore: true,
              deduction: true,
              finalScore: true,
              plagiarismStatus: true,
            },
          },
          facultyEvaluation: {
            select: {
              pptDemoScore: true,
              vivaTotalScore: true,
              totalFacultyScore: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return { total, submissions };
  }

  async create(data: {
    classroomId: string;
    submitterId: string;
    teamId?: string;
    title: string;
    category?: string;
    description?: string;
    problemStatement?: string;
    proposedSolution?: string;
    objectives?: string;
    innovation?: string;
    features?: string;
    targetUsers?: string;
    technologies?: string[];
    programmingLanguages?: string[];
    testingApproach?: string;
    limitations?: string;
    futureEnhancements?: string;
    githubUrl?: string;
    liveDemoUrl?: string;
    resources?: Array<{ type: string; name: string; url?: string; size?: string }>;
  }) {
    return prisma.submission.create({
      data: {
        classroomId: data.classroomId,
        submitterId: data.submitterId,
        teamId: data.teamId,
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
        status: 'Submitted',
        resources: data.resources
          ? {
              create: data.resources.map((r) => ({
                type: r.type,
                name: r.name,
                url: r.url,
                size: r.size,
                status: 'uploaded',
              })),
            }
          : undefined,
      },
      include: {
        submitter: { select: safeUserSelect },
        resources: true,
      },
    });
  }

  async update(id: string, data: any) {
    return prisma.submission.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.submission.delete({
      where: { id },
    });
  }

  async updateStatus(id: string, status: string) {
    return prisma.submission.update({
      where: { id },
      data: { status },
    });
  }

  async updateFinalScore(id: string, finalScore: number) {
    return prisma.submission.update({
      where: { id },
      data: {
        finalTotalScore: finalScore,
      },
    });
  }
}

export const submissionRepository = new SubmissionRepository();

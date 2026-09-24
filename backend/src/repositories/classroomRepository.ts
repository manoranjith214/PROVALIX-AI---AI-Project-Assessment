import { prisma } from '../config/prisma';
import { safeUserSelect } from './userRepository';
import { PaginationParams } from '../types';

export class ClassroomRepository {
  async findById(id: string) {
    return prisma.classroom.findUnique({
      where: { id },
      include: {
        owner: { select: safeUserSelect },
        invitations: true,
        members: {
          include: {
            user: { select: safeUserSelect },
          },
        },
        evaluators: {
          include: {
            evaluator: { select: safeUserSelect },
          },
        },
        submissions: {
          select: {
            id: true,
            title: true,
            status: true,
            finalTotalScore: true,
            submittedAt: true,
            submitter: { select: safeUserSelect },
            team: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    return prisma.classroom.findUnique({
      where: { code },
      include: {
        owner: { select: safeUserSelect },
      },
    });
  }

  async list(userId: string, params: PaginationParams) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
        { evaluators: { some: { evaluatorId: userId } } },
      ],
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, classrooms] = await Promise.all([
      prisma.classroom.count({ where }),
      prisma.classroom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: safeUserSelect },
          members: {
            where: { userId },
            select: { role: true },
          },
          _count: {
            select: {
              members: true,
              submissions: true,
            },
          },
        },
      }),
    ]);

    return { total, classrooms };
  }

  async create(data: {
    name: string;
    description?: string;
    code: string;
    logo?: string;
    ownerId: string;
    startDate: Date;
    deadline: Date;
    submissionMode: string;
    minTeamSize?: number;
    maxTeamSize?: number;
    resourcesConfig?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const classroom = await tx.classroom.create({
        data: {
          name: data.name,
          description: data.description,
          code: data.code,
          logo: data.logo,
          ownerId: data.ownerId,
          startDate: data.startDate,
          deadline: data.deadline,
          submissionMode: data.submissionMode,
          minTeamSize: data.minTeamSize,
          maxTeamSize: data.maxTeamSize,
          resourcesConfig: data.resourcesConfig,
        },
      });

      // Creator is automatically OWNER in ClassroomMember
      await tx.classroomMember.create({
        data: {
          classroomId: classroom.id,
          userId: data.ownerId,
          role: 'OWNER',
          status: 'Approved',
        },
      });

      return tx.classroom.findUnique({
        where: { id: classroom.id },
        include: {
          owner: { select: safeUserSelect },
          members: {
            include: {
              user: { select: safeUserSelect },
            },
          },
        },
      });
    }, { maxWait: 15000, timeout: 30000 });
  }

  async update(id: string, data: any) {
    return prisma.classroom.update({
      where: { id },
      data,
      include: {
        owner: { select: safeUserSelect },
      },
    });
  }

  async delete(id: string) {
    return prisma.classroom.delete({
      where: { id },
    });
  }

  async countSubmissions(classroomId: string): Promise<number> {
    return prisma.submission.count({
      where: { classroomId },
    });
  }

  async findMember(classroomId: string, userId: string) {
    return prisma.classroomMember.findUnique({
      where: {
        classroomId_userId: {
          classroomId,
          userId,
        },
      },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async updateMemberStatus(classroomId: string, userId: string, status: string) {
    return prisma.classroomMember.update({
      where: {
        classroomId_userId: {
          classroomId,
          userId,
        },
      },
      data: { status },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async addMember(classroomId: string, userId: string, role: string, status: string = 'Approved') {
    return prisma.classroomMember.upsert({
      where: {
        classroomId_userId: {
          classroomId,
          userId,
        },
      },
      update: { role, status },
      create: {
        classroomId,
        userId,
        role,
        status,
      },
      include: {
        user: { select: safeUserSelect },
      },
    });
  }

  async removeMember(classroomId: string, userId: string) {
    return prisma.classroomMember.delete({
      where: {
        classroomId_userId: {
          classroomId,
          userId,
        },
      },
    });
  }

  async createInvitation(classroomId: string, email: string, userId?: string) {
    return prisma.classroomInvitation.create({
      data: {
        classroomId,
        email: email.toLowerCase(),
        userId,
      },
    });
  }

  async assignEvaluator(classroomId: string, evaluatorId: string, submissionId?: string) {
    return prisma.$transaction(async (tx) => {
      // Ensure member has EVALUATOR role in ClassroomMember
      await tx.classroomMember.upsert({
        where: {
          classroomId_userId: {
            classroomId,
            userId: evaluatorId,
          },
        },
        update: { role: 'EVALUATOR' },
        create: {
          classroomId,
          userId: evaluatorId,
          role: 'EVALUATOR',
        },
      });

      const evaluator = await tx.classroomEvaluator.create({
        data: {
          classroomId,
          evaluatorId,
          submissionId,
        },
        include: {
          evaluator: { select: safeUserSelect },
        },
      });

      if (submissionId) {
        await tx.submission.update({
          where: { id: submissionId },
          data: { assignedEvaluatorId: evaluatorId },
        });
      }

      return evaluator;
    }, { maxWait: 15000, timeout: 30000 });
  }

  async removeEvaluator(evaluatorAssignmentId: string) {
    return prisma.classroomEvaluator.delete({
      where: { id: evaluatorAssignmentId },
    });
  }
}

export const classroomRepository = new ClassroomRepository();

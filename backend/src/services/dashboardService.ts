import { prisma } from '../config/prisma';

export class DashboardService {
  async getSummary(userId: string) {
    const [
      totalProjects,
      totalTeams,
      activeClassrooms,
      userSubmissions,
      notificationsCount,
    ] = await Promise.all([
      prisma.projectCheckerProject.count({ where: { userId } }),
      prisma.team.count({
        where: {
          OR: [{ captainId: userId }, { members: { some: { userId } } }],
        },
      }),
      prisma.classroom.count({
        where: {
          OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          status: 'Active',
        },
      }),
      prisma.submission.findMany({
        where: { submitterId: userId },
        select: {
          id: true,
          finalTotalScore: true,
          status: true,
        },
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    // Compute average score across user submissions
    const scoredSubmissions = userSubmissions.filter((s) => s.finalTotalScore !== null);
    const averageScore =
      scoredSubmissions.length > 0
        ? Math.round(
            (scoredSubmissions.reduce((acc, s) => acc + (s.finalTotalScore || 0), 0) /
              scoredSubmissions.length) *
              10
          ) / 10
        : null;

    return {
      totalProjects,
      totalTeams,
      activeClassrooms,
      totalSubmissions: userSubmissions.length,
      averageScore,
      unreadNotifications: notificationsCount,
    };
  }

  async getRecentReports(userId: string) {
    // Recent Project Checker evaluations
    const recentProjects = await prisma.projectCheckerProject.findMany({
      where: {
        userId,
        aiEvaluation: { isNot: null },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        aiEvaluation: {
          select: {
            totalScore: true,
            evaluatedAt: true,
            aiModel: true,
          },
        },
        plagiarism: {
          select: {
            overallSimilarity: true,
            status: true,
          },
        },
      },
    });

    return recentProjects;
  }

  async getUpcomingDeadlines(userId: string) {
    const now = new Date();
    return prisma.classroom.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
        deadline: { gte: now },
      },
      orderBy: { deadline: 'asc' },
      take: 5,
      select: {
        id: true,
        name: true,
        code: true,
        startDate: true,
        deadline: true,
        submissionMode: true,
      },
    });
  }

  async getCurrentEvaluations(userId: string) {
    // Evaluator pending submissions or student submitted waiting for evaluation
    return prisma.submission.findMany({
      where: {
        OR: [
          { submitterId: userId },
          { assignedEvaluatorId: userId },
          { classroom: { ownerId: userId } },
        ],
      },
      orderBy: { submittedAt: 'desc' },
      take: 8,
      include: {
        classroom: { select: { id: true, name: true } },
        submitter: { select: { name: true, permanentId: true } },
        verification: { select: { status: true } },
      },
    });
  }

  async getLeaderboardPreview(userId: string) {
    // Pick the most recent active classroom the user is in and show top 5
    const classroom = await prisma.classroom.findFirst({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!classroom) {
      return { classroomName: null, topRanked: [] };
    }

    const submissions = await prisma.submission.findMany({
      where: {
        classroomId: classroom.id,
        verification: { status: 'Approved' },
        finalTotalScore: { not: null },
      },
      orderBy: { finalTotalScore: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        finalTotalScore: true,
        team: { select: { name: true } },
        submitter: { select: { name: true } },
      },
    });

    const topRanked = submissions.map((sub, index) => ({
      rank: index + 1,
      projectTitle: sub.title,
      name: sub.team?.name || sub.submitter.name,
      finalTotalScore: sub.finalTotalScore,
    }));

    return {
      classroomId: classroom.id,
      classroomName: classroom.name,
      topRanked,
    };
  }
}

export const dashboardService = new DashboardService();

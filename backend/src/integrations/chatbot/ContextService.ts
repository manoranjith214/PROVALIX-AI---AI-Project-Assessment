import { prisma } from '../../config/prisma';
import { AppError } from '../../middleware/errorMiddleware';

export interface AuthorizedProjectContext {
  projectTitle: string;
  contextString: string;
  sourceReference: {
    title: string;
    category: string;
    id: string;
  };
}

export interface UserContextResult {
  contextString: string;
  sourceReference?: {
    title: string;
    category: string;
    id?: string;
  };
  hasData: boolean;
}

export class ContextService {
  /**
   * Retrieves authorized project context while strictly enforcing student privacy.
   * If a student asks about a project/submission that doesn't belong to them and
   * they are not a classroom evaluator or owner, access is strictly rejected.
   */
  async getAuthorizedProjectContext(
    userId: string,
    projectId?: string,
    submissionId?: string
  ): Promise<AuthorizedProjectContext | null> {
    // 1. Check Standalone Project Checker Project
    if (projectId) {
      const project = await prisma.projectCheckerProject.findUnique({
        where: { id: projectId },
        include: {
          aiEvaluation: true,
          plagiarism: true,
        },
      });

      if (!project) {
        throw new AppError('Specified project was not found.', 404);
      }

      // Strict privacy check: only the project owner can access their standalone project details
      if (project.userId !== userId) {
        throw new AppError('Privacy Restriction: You are not authorized to access this project evaluation.', 403);
      }

      const ai = project.aiEvaluation;
      const plag = project.plagiarism;

      const contextParts = [
        `Project Details: "${project.title}" (Category: ${project.category || 'General'})`,
        `Problem Statement: ${project.problemStatement || 'N/A'}`,
        `Proposed Solution: ${project.proposedSolution || 'N/A'}`,
      ];

      if (ai) {
        contextParts.push(
          `AI Total Score: ${ai.totalScore}/100`,
          `Criteria Breakdown: Problem Definition=${ai.problemDefinitionScore}/15, Innovation=${ai.innovationNoveltyScore}/20, Technical Implementation=${ai.technicalImplementationScore}/20, Functionality=${ai.functionalityScore}/15, Code Quality=${ai.codeQualityScore}/10, Documentation=${ai.documentationScore}/10, Overall Quality=${ai.overallQualityScore}/10`,
          `Strengths: ${ai.strengths}`,
          `Areas for Improvement: ${ai.weaknesses}`,
          `Improvement Plan: ${ai.improvementPlan}`
        );
      }

      if (plag) {
        contextParts.push(
          `Plagiarism: Overall Similarity=${plag.overallSimilarity}%, Status=${plag.status}, Deduction=${plag.deduction} marks, Reason=${plag.reason || 'None'}`
        );
      }

      return {
        projectTitle: project.title,
        contextString: contextParts.join('\n'),
        sourceReference: {
          title: `Project Checker: ${project.title}`,
          category: 'User Project Evaluation',
          id: project.id,
        },
      };
    }

    // 2. Check Classroom Submission
    if (submissionId) {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: {
          classroom: {
            include: {
              evaluators: true,
            },
          },
          team: {
            include: {
              members: true,
            },
          },
          aiEvaluation: true,
          facultyEvaluation: {
            include: {
              vivaResponses: true,
            },
          },
        },
      });

      if (!submission) {
        throw new AppError('Specified submission was not found.', 404);
      }

      // Strict privacy check
      const isSubmitter = submission.submitterId === userId;
      const isTeamMember = submission.team?.members.some((m) => m.userId === userId) ?? false;
      const isClassroomOwner = submission.classroom.ownerId === userId;
      const isEvaluator = submission.classroom.evaluators.some((e) => e.evaluatorId === userId);

      if (!isSubmitter && !isTeamMember && !isClassroomOwner && !isEvaluator) {
        throw new AppError(
          'Privacy Restriction: You are not authorized to query or view detailed evaluation for this submission.',
          403
        );
      }

      const contextParts = [
        `Classroom Submission: "${submission.title}" in Classroom "${submission.classroom.name}"`,
        `Submitter: ${isSubmitter ? 'You' : 'Team Member / Student'}`,
        `Status: ${submission.status}`,
        `Final Total Score: ${submission.finalTotalScore ? submission.finalTotalScore + '/100' : 'Pending Verification'}`,
      ];

      if (submission.aiEvaluation) {
        contextParts.push(
          `Classroom AI Score: ${submission.aiEvaluation.finalScore}/50 (Raw: ${submission.aiEvaluation.rawScore}/50, Plagiarism Deduction: ${submission.aiEvaluation.deduction})`,
          `AI Feedback: ${submission.aiEvaluation.feedback}`
        );
      }

      if (submission.facultyEvaluation) {
        contextParts.push(
          `Faculty Total Score: ${submission.facultyEvaluation.totalFacultyScore}/50 (PPT/Demo: ${submission.facultyEvaluation.pptDemoScore}/25, Viva Defense: ${submission.facultyEvaluation.vivaTotalScore}/25)`,
          `Faculty Status: ${submission.facultyEvaluation.status}`,
          `Faculty Feedback: ${submission.facultyEvaluation.feedback}`
        );
      }

      return {
        projectTitle: submission.title,
        contextString: contextParts.join('\n'),
        sourceReference: {
          title: `Classroom Submission: ${submission.title}`,
          category: 'Classroom Evaluation',
          id: submission.id,
        },
      };
    }

    return null;
  }

  /**
   * Retrieves user's latest project evaluation status (Project Checker or Classroom Submission)
   * without requiring explicit IDs in the query.
   */
  async getUserEvaluationContext(userId: string, projectId?: string, submissionId?: string): Promise<UserContextResult> {
    if (projectId || submissionId) {
      const explicit = await this.getAuthorizedProjectContext(userId, projectId, submissionId);
      if (explicit) {
        return {
          contextString: explicit.contextString,
          sourceReference: explicit.sourceReference,
          hasData: true,
        };
      }
    }

    // Check latest Project Checker project
    const latestProject = await prisma.projectCheckerProject.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        aiEvaluation: true,
        plagiarism: true,
      },
    });

    // Check latest Classroom Submission (as submitter or team member)
    const latestSubmission = await prisma.submission.findFirst({
      where: {
        OR: [
          { submitterId: userId },
          { team: { members: { some: { userId } } } },
        ],
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        classroom: true,
        aiEvaluation: true,
        facultyEvaluation: true,
        verification: true,
      },
    });

    const contextParts: string[] = [];

    if (latestProject && latestProject.aiEvaluation) {
      const ai = latestProject.aiEvaluation;
      const plag = latestProject.plagiarism;
      contextParts.push(
        `=== Latest Project Checker: "${latestProject.title}" ===`,
        `AI Total Score: ${ai.totalScore}/100`,
        `Criteria Breakdown: Problem Definition=${ai.problemDefinitionScore}/15, Innovation=${ai.innovationNoveltyScore}/20, Technical Implementation=${ai.technicalImplementationScore}/20, Functionality=${ai.functionalityScore}/15, Code Quality=${ai.codeQualityScore}/10, Documentation=${ai.documentationScore}/10, Overall Quality=${ai.overallQualityScore}/10`,
        `Strengths: ${ai.strengths}`,
        `Weaknesses: ${ai.weaknesses}`,
        `Improvement Plan: ${ai.improvementPlan}`
      );
      if (plag) {
        contextParts.push(
          `Plagiarism: ${plag.overallSimilarity}% similarity (Status: ${plag.status}, Deduction: ${plag.deduction} marks)`
        );
      }
    }

    if (latestSubmission) {
      contextParts.push(
        `=== Latest Classroom Submission: "${latestSubmission.title}" in Classroom "${latestSubmission.classroom.name}" ===`,
        `Submission Status: ${latestSubmission.status}`,
        `Final Total Score: ${latestSubmission.finalTotalScore != null ? latestSubmission.finalTotalScore + '/100' : 'Pending Verification / Incomplete'}`
      );
      if (latestSubmission.aiEvaluation) {
        contextParts.push(
          `AI Score: ${latestSubmission.aiEvaluation.finalScore}/50 (Plagiarism Deduction: ${latestSubmission.aiEvaluation.deduction})`,
          `AI Feedback: ${latestSubmission.aiEvaluation.feedback}`
        );
      }
      if (latestSubmission.facultyEvaluation) {
        contextParts.push(
          `Faculty Score: ${latestSubmission.facultyEvaluation.totalFacultyScore}/50 (PPT/Demo: ${latestSubmission.facultyEvaluation.pptDemoScore}/25, Viva: ${latestSubmission.facultyEvaluation.vivaTotalScore}/25)`,
          `Faculty Status: ${latestSubmission.facultyEvaluation.status}`,
          `Faculty Feedback: ${latestSubmission.facultyEvaluation.feedback}`
        );
      }
      if (latestSubmission.verification) {
        contextParts.push(
          `Verification Status: ${latestSubmission.verification.status}`,
          `Verification Feedback: ${latestSubmission.verification.feedback || 'None'}`
        );
      }
    }

    if (contextParts.length === 0) {
      return {
        contextString: 'No project evaluation records found for your account. You have not submitted or checked any project yet.',
        sourceReference: {
          title: 'Evaluation Status',
          category: 'User Project Evaluation',
        },
        hasData: false,
      };
    }

    const title = latestProject?.title || latestSubmission?.title || 'User Evaluation';
    return {
      contextString: contextParts.join('\n'),
      sourceReference: {
        title: `Evaluation: ${title}`,
        category: 'User Project Evaluation',
      },
      hasData: true,
    };
  }

  /**
   * Retrieves user's upcoming classroom and project deadlines sorted by nearest date.
   */
  async getUserDeadlinesContext(userId: string): Promise<UserContextResult> {
    const memberships = await prisma.classroomMember.findMany({
      where: { userId },
      include: {
        classroom: {
          include: {
            submissions: {
              where: { submitterId: userId },
              select: { id: true, status: true, submittedAt: true },
            },
          },
        },
      },
    });

    if (!memberships || memberships.length === 0) {
      return {
        contextString: 'No upcoming deadlines found. You are not currently enrolled in any classrooms.',
        sourceReference: {
          title: 'Upcoming Deadlines',
          category: 'Classroom Deadlines',
        },
        hasData: false,
      };
    }

    const now = new Date();
    const sorted = memberships
      .map((m) => m.classroom)
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    const deadlineLines: string[] = [];

    for (const c of sorted) {
      const deadlineDate = new Date(c.deadline);
      const isPast = deadlineDate < now;
      const hasSubmitted = c.submissions.length > 0;
      const formattedDate = deadlineDate.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      deadlineLines.push(
        `- Classroom: "${c.name}" (Code: ${c.code})\n  Deadline: ${formattedDate} (${isPast ? 'Passed' : 'Upcoming'})\n  Submission Status: ${hasSubmitted ? 'Submitted (' + c.submissions[0].status + ')' : 'Pending Submission'}\n  Mode: ${c.submissionMode}`
      );
    }

    return {
      contextString: `Upcoming Classroom Deadlines:\n${deadlineLines.join('\n\n')}`,
      sourceReference: {
        title: 'Classroom Deadlines',
        category: 'Classroom Deadlines',
      },
      hasData: true,
    };
  }

  /**
   * Retrieves authenticated user's team details, captain, members, and participation.
   */
  async getUserTeamsContext(userId: string): Promise<UserContextResult> {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            captain: {
              select: { name: true, email: true, permanentId: true },
            },
            members: {
              include: {
                user: {
                  select: { name: true, email: true, permanentId: true, department: true },
                },
              },
            },
            submissions: {
              include: {
                classroom: {
                  select: { name: true, code: true, deadline: true },
                },
              },
            },
          },
        },
      },
    });

    if (!memberships || memberships.length === 0) {
      return {
        contextString: 'You are not currently enrolled in or assigned to any team.',
        sourceReference: {
          title: 'Team Management',
          category: 'Team Details',
        },
        hasData: false,
      };
    }

    const teamLines = memberships.map((m) => {
      const t = m.team;
      const isUserCaptain = t.captainId === userId;
      const captainName = t.captain?.name || 'Assigned Captain';
      const captainId = t.captain?.permanentId ? ` (${t.captain.permanentId})` : '';
      const memberNames = (t.members || [])
        .map((tm) => `${tm.user?.name || 'Member'} (${tm.role || 'MEMBER'}${tm.userId === userId ? ' - You' : ''})`)
        .join(', ');

      const classroomNames = (t.submissions && t.submissions.length > 0)
        ? t.submissions.map((s) => `"${s.classroom?.name || 'Classroom'}" (Status: ${s.status})`).join(', ')
        : 'None currently';

      return [
        `Team Name: "${t.name}" (Code: ${t.code})`,
        `Your Role: ${isUserCaptain ? 'Team Captain' : 'Team Member'}`,
        `Team Captain: ${captainName}${captainId}`,
        `Members (${(t.members || []).length}/${t.maxSize || 5}): ${memberNames}`,
        `Classrooms / Submissions: ${classroomNames}`,
      ].join('\n');
    });

    return {
      contextString: `Your Team Information:\n\n${teamLines.join('\n\n---\n\n')}`,
      sourceReference: {
        title: `Team: ${memberships[0].team.name}`,
        category: 'Team Details',
      },
      hasData: true,
    };
  }

  /**
   * Retrieves classrooms user is enrolled in.
   */
  async getUserClassroomsContext(userId: string): Promise<UserContextResult> {
    const memberships = await prisma.classroomMember.findMany({
      where: { userId },
      include: {
        classroom: {
          include: {
            owner: { select: { name: true, department: true } },
          },
        },
      },
    });

    if (!memberships || memberships.length === 0) {
      return {
        contextString: 'You are not currently enrolled in any classroom.',
        sourceReference: {
          title: 'Classroom Enrollment',
          category: 'Classroom',
        },
        hasData: false,
      };
    }

    const lines = memberships.map((m) => {
      const c = m.classroom;
      return `- "${c.name}" (Code: ${c.code}) - Instructor: ${c.owner.name} (${c.owner.department || 'Faculty'}), Mode: ${c.submissionMode}, Status: ${c.status}`;
    });

    return {
      contextString: `Enrolled Classrooms:\n${lines.join('\n')}`,
      sourceReference: {
        title: 'Enrolled Classrooms',
        category: 'Classroom',
      },
      hasData: true,
    };
  }

  /**
   * Calculates authorized user's rank in their classroom submissions without exposing
   * other students' private project code or identities.
   */
  async getUserRankingContext(userId: string): Promise<UserContextResult> {
    const submissions = await prisma.submission.findMany({
      where: {
        OR: [
          { submitterId: userId },
          { team: { members: { some: { userId } } } },
        ],
      },
      include: {
        classroom: true,
      },
    });

    if (!submissions || submissions.length === 0) {
      return {
        contextString: 'No rankings available because you have not submitted any projects to classrooms yet.',
        sourceReference: {
          title: 'Classroom Leaderboard',
          category: 'Ranking',
        },
        hasData: false,
      };
    }

    const rankLines: string[] = [];

    for (const sub of submissions) {
      if (sub.finalTotalScore == null) {
        rankLines.push(
          `- Classroom "${sub.classroom.name}": Submission "${sub.title}" is pending final verification. Results have not been published yet.`
        );
        continue;
      }

      // Count all verified submissions in this classroom
      const totalInClass = await prisma.submission.count({
        where: { classroomId: sub.classroomId, finalTotalScore: { not: null } },
      });

      // Count submissions with higher score
      const higherCount = await prisma.submission.count({
        where: {
          classroomId: sub.classroomId,
          finalTotalScore: { gt: sub.finalTotalScore },
        },
      });

      const rank = higherCount + 1;
      rankLines.push(
        `- Classroom "${sub.classroom.name}": Rank ${rank} of ${totalInClass} submissions (Final Total Score: ${sub.finalTotalScore}/100, Status: ${sub.status})`
      );
    }

    return {
      contextString: `Your Classroom Ranking & Standing:\n${rankLines.join('\n')}`,
      sourceReference: {
        title: 'Classroom Ranking',
        category: 'Ranking',
      },
      hasData: true,
    };
  }

  /**
   * Retrieves user's recent notifications.
   */
  async getUserNotificationsContext(userId: string): Promise<UserContextResult> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (!notifications || notifications.length === 0) {
      return {
        contextString: 'You have no recent notifications in your Provalix account.',
        sourceReference: {
          title: 'Notifications',
          category: 'Notifications',
        },
        hasData: false,
      };
    }

    const lines = notifications.map((n) => {
      const status = n.read ? 'Read' : 'Unread';
      const time = new Date(n.createdAt).toLocaleDateString();
      return `- [${status}] ${n.title}: ${n.message} (${time})`;
    });

    return {
      contextString: `Recent Notifications:\n${lines.join('\n')}`,
      sourceReference: {
        title: 'Recent Notifications',
        category: 'Notifications',
      },
      hasData: true,
    };
  }

  /**
   * Retrieves high-level user background without revealing private data
   */
  async getUserGeneralContext(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        permanentId: true,
        department: true,
        college: true,
        year: true,
      },
    });

    if (!user) return '';

    return `Authenticated User: ${user.name} (${user.permanentId}), Department: ${user.department || 'N/A'}, Year: ${user.year || 'N/A'}`;
  }
}

export const contextService = new ContextService();

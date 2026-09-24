import { evaluationRepository } from '../repositories/evaluationRepository';
import { classroomRepository } from '../repositories/classroomRepository';
import { AppError } from '../middleware/errorMiddleware';

export class LeaderboardService {
  async getClassroomLeaderboard(classroomId: string, currentUserId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    const isOwner = classroom.ownerId === currentUserId;
    const isEvaluator = classroom.evaluators.some((e) => e.evaluatorId === currentUserId);

    // Fetch only verified & approved submissions with calculated finalTotalScore
    const verifiedSubmissions = await evaluationRepository.getLeaderboardData(classroomId);

    // Build ranked list
    const rankedList = verifiedSubmissions.map((sub, index) => {
      const rank = index + 1;
      const isAuthor = sub.submitterId === currentUserId;
      const isTeamMember = sub.team?.members.some((m) => m.userId === currentUserId) ?? false;
      const hasPrivilegedAccess = isOwner || isEvaluator || isAuthor || isTeamMember;

      const baseInfo = {
        rank,
        submissionId: sub.id,
        projectTitle: sub.title,
        teamOrSubmitterName: sub.team?.name || sub.submitter.name,
        teamLogo: sub.team?.logo || null,
        isTeam: !!sub.teamId,
        finalTotalScore: sub.finalTotalScore,
        status: 'Verified',
        isOwnSubmission: isAuthor || isTeamMember,
      };

      if (hasPrivilegedAccess) {
        // Detailed evaluation data allowed for Owner, Evaluators, or the Author / Team members
        return {
          ...baseInfo,
          detailedEvaluation: {
            aiScore: sub.aiEvaluation?.finalScore ?? null,
            aiDeduction: sub.aiEvaluation?.deduction ?? 0,
            aiFeedback: sub.aiEvaluation?.feedback ?? null,
            improvementPlan: sub.aiEvaluation?.improvementPlan
              ? JSON.parse(sub.aiEvaluation.improvementPlan)
              : [],
            facultyEvaluation: sub.facultyEvaluation
              ? {
                  pptDemoScore: sub.facultyEvaluation.pptDemoScore,
                  vivaTotalScore: sub.facultyEvaluation.vivaTotalScore,
                  totalFacultyScore: sub.facultyEvaluation.totalFacultyScore,
                  feedback: sub.facultyEvaluation.feedback,
                  status: sub.facultyEvaluation.status,
                }
              : null,
          },
        };
      }

      // Privacy Rule: Other participants can ONLY see rank, project/team name, and final score.
      return baseInfo;
    });

    return {
      classroomId: classroom.id,
      classroomName: classroom.name,
      totalRanked: rankedList.length,
      leaderboard: rankedList,
    };
  }
}

export const leaderboardService = new LeaderboardService();

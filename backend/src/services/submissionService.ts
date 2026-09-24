import { prisma } from '../config/prisma';
import { submissionRepository } from '../repositories/submissionRepository';
import { classroomRepository } from '../repositories/classroomRepository';
import { teamRepository } from '../repositories/teamRepository';
import { notificationService } from './notificationService';
import { PaginationParams } from '../types';
import { AppError } from '../middleware/errorMiddleware';

export class SubmissionService {
  async createSubmission(classroomId: string, submitterId: string, data: any) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    // Check submission deadline
    if (new Date() > new Date(classroom.deadline)) {
      throw new AppError('Submission deadline has passed for this classroom', 400);
    }

    let teamId = data.teamId;

    // Validate Team submission mode
    if (classroom.submissionMode === 'Team') {
      if (!teamId) {
        throw new AppError('A team selection is required for team-based classroom submissions', 400);
      }
      const team = await teamRepository.findById(teamId);
      if (!team) {
        throw new AppError('Selected team does not exist', 404);
      }

      // Requirement: Only the team captain submits on behalf of the team
      if (team.captainId !== submitterId) {
        throw new AppError('Only the team captain can submit on behalf of the team', 403);
      }

      // Requirement: Exactly one project submission per participating team
      const existingTeamSub = await prisma.submission.findFirst({
        where: { classroomId, teamId },
      });
      if (existingTeamSub) {
        throw new AppError('This team has already submitted a project to this classroom', 400);
      }

      // Ensure all accepted team members receive access to the classroom and submission
      for (const member of team.members) {
        await classroomRepository.addMember(classroomId, member.userId, 'MEMBER');
      }
    } else {
      // Requirement: In Individual mode, each participant submits their own project (prevent duplicate)
      const existingUserSub = await prisma.submission.findFirst({
        where: { classroomId, submitterId },
      });
      if (existingUserSub) {
        throw new AppError('You have already submitted a project to this classroom', 400);
      }

      // Ensure submitter is enrolled as a member
      await classroomRepository.addMember(classroomId, submitterId, 'MEMBER');
    }

    const submission = await submissionRepository.create({
      classroomId,
      submitterId,
      teamId,
      title: data.title,
      category: data.category,
      description: data.description,
      problemStatement: data.problemStatement,
      proposedSolution: data.proposedSolution,
      objectives: data.objectives,
      innovation: data.innovation,
      features: data.features,
      targetUsers: data.targetUsers,
      technologies: data.technologies,
      programmingLanguages: data.programmingLanguages,
      testingApproach: data.testingApproach,
      limitations: data.limitations,
      futureEnhancements: data.futureEnhancements,
      githubUrl: data.githubUrl,
      liveDemoUrl: data.liveDemoUrl,
      resources: data.resources,
    });

    // Notify classroom owner
    await notificationService.notify(
      classroom.ownerId,
      'new_submission',
      'New Project Submission Received',
      `"${submission.title}" was submitted to "${classroom.name}".`,
      `/classrooms/${classroomId}/submissions/${submission.id}`
    );

    // Notify submitter confirmation
    await notificationService.notify(
      submitterId,
      'submission_success',
      'Submission Successfully Recorded',
      `Your submission "${submission.title}" was successfully recorded.`,
      `/classrooms/${classroomId}`
    );

    return submission;
  }

  async listSubmissions(classroomId: string, params: PaginationParams) {
    return submissionRepository.listByClassroom(classroomId, params);
  }

  async getSubmissionById(submissionId: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }
    return submission;
  }

  async updateSubmission(submissionId: string, userId: string, data: any) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Only submitter or team captain can edit before verification
    const isSubmitter = submission.submitterId === userId;
    const isCaptain = submission.team?.captainId === userId;

    if (!isSubmitter && !isCaptain) {
      throw new AppError('You do not have permission to edit this submission', 403);
    }

    if (submission.status === 'Verified') {
      throw new AppError('Cannot modify a verified and approved submission', 400);
    }

    return submissionRepository.update(submissionId, data);
  }

  async deleteSubmission(submissionId: string, userId: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const isSubmitter = submission.submitterId === userId;
    const isOwner = submission.classroom.ownerId === userId;

    if (!isSubmitter && !isOwner) {
      throw new AppError('You do not have permission to delete this submission', 403);
    }

    await submissionRepository.delete(submissionId);
    return { message: 'Submission deleted successfully' };
  }
}

export const submissionService = new SubmissionService();

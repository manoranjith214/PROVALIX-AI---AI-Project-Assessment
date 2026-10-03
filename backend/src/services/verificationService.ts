import { evaluationRepository } from '../repositories/evaluationRepository';
import { submissionRepository } from '../repositories/submissionRepository';
import { classroomRepository } from '../repositories/classroomRepository';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorMiddleware';

export class VerificationService {
  async getClassroomVerifications(classroomId: string) {
    const classroom = await classroomRepository.findById(classroomId);
    if (!classroom) {
      throw new AppError('Classroom not found', 404);
    }

    // Return submissions that are ready for verification (Faculty_Evaluated or already Verified)
    const result = await submissionRepository.listByClassroom(classroomId, {
      page: 1,
      limit: 100,
    });

    return result.submissions;
  }

  async verifySubmission(submissionId: string, verifiedById: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Role check: Only the classroom owner can verify and officially approve submissions
    if (submission.classroom.ownerId !== verifiedById) {
      throw new AppError('Only the classroom owner can verify and officially publish submissions', 403);
    }

    if (!submission.facultyEvaluation) {
      throw new AppError('Cannot verify a submission before faculty evaluation is completed', 400);
    }

    const verification = await evaluationRepository.upsertVerification({
      submissionId,
      verifiedById,
      status: 'Approved',
    });

    await submissionRepository.updateStatus(submissionId, 'Verified');

    // Notify submitter that results are approved
    await notificationService.notify(
      submission.submitterId,
      'result_published',
      'Evaluation Approved & Published',
      `Your evaluation for "${submission.title}" has been verified and officially published.`,
      `/submissions/${submissionId}`
    );

    return verification;
  }

  async returnSubmission(
    submissionId: string,
    verifiedById: string,
    data: { reason: string; feedback: string }
  ) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Role check: Only the classroom owner or assigned evaluators can return a submission
    const classroom = submission.classroom;
    const isOwner = classroom.ownerId === verifiedById;
    const isAssigned = submission.assignedEvaluatorId === verifiedById;
    const isEvaluator = classroom.evaluators?.some((e: any) => e.evaluatorId === verifiedById);

    if (!isOwner && !isAssigned && !isEvaluator) {
      throw new AppError('Only the classroom owner or assigned evaluators can return an evaluation', 403);
    }

    const verification = await evaluationRepository.upsertVerification({
      submissionId,
      verifiedById,
      status: 'Returned',
      returnReason: data.reason,
      feedback: data.feedback,
    });

    await submissionRepository.updateStatus(submissionId, 'Returned');

    // Notify submitter and assigned evaluator
    await notificationService.notify(
      submission.submitterId,
      'returned_evaluation',
      'Evaluation Returned for Revision',
      `Your submission evaluation has been returned: "${data.reason}". Feedback: ${data.feedback}`,
      `/submissions/${submissionId}`
    );

    if (submission.facultyEvaluation?.evaluatorId) {
      await notificationService.notify(
        submission.facultyEvaluation.evaluatorId,
        'returned_evaluation',
        'Submission Evaluation Returned by Owner',
        `Evaluation for "${submission.title}" was returned by the classroom owner. Reason: ${data.reason}`
      );
    }

    return verification;
  }
}

export const verificationService = new VerificationService();

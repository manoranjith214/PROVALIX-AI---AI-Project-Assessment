import { evaluationRepository } from '../repositories/evaluationRepository';
import { submissionRepository } from '../repositories/submissionRepository';
import { defaultAIProvider } from '../integrations/ai/MockAIProvider';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorMiddleware';
import { SubmitVivaMarksInput } from '../validators/vivaValidator';

export class VivaService {
  /**
   * Helper to check if a user is an authorized evaluator, classroom owner, or admin
   */
  isEvaluatorOrOwner(submission: any, userId: string, userRole?: string): boolean {
    if (userRole === 'admin') return true;
    if (submission.classroom?.ownerId === userId) return true;
    if (submission.assignedEvaluatorId === userId) return true;
    if (submission.classroom?.evaluators?.some((e: any) => e.evaluatorId === userId)) return true;
    return false;
  }

  /**
   * Helper to check if a user is the submitter or a member of the submitting team
   */
  isStudentOfSubmission(submission: any, userId: string): boolean {
    if (submission.submitterId === userId) return true;
    if (
      submission.team?.members?.some(
        (m: any) => m.userId === userId || m.user?.id === userId
      )
    ) {
      return true;
    }
    return false;
  }

  /**
   * Generate 5 project-specific viva questions using AIProvider
   */
  async generateVivaQuestions(submissionId: string, user: { id: string; role?: string }) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (!this.isEvaluatorOrOwner(submission, user.id, user.role)) {
      throw new AppError('Only assigned evaluators or classroom owners can generate viva questions', 403);
    }

    // Call AI provider to generate exactly 5 project-tailored questions across the 5 categories
    const generatedQuestions = await defaultAIProvider.generateVivaQuestions(submission);

    // Persist questions in database
    const savedQuestions = await evaluationRepository.saveGeneratedVivaQuestions(
      submissionId,
      generatedQuestions
    );

    return {
      submissionId,
      totalQuestions: savedQuestions.length,
      maxTotalMarks: 25,
      questions: savedQuestions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        category: q.category,
        maxMarks: q.maxScore,
      })),
    };
  }

  /**
   * Retrieve viva questions for a submission.
   * If not yet generated and requested by faculty/evaluator/owner, auto-generates them.
   */
  async getVivaQuestions(submissionId: string, user: { id: string; role?: string }) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const isAuthorizedFaculty = this.isEvaluatorOrOwner(submission, user.id, user.role);
    const isStudent = this.isStudentOfSubmission(submission, user.id);

    if (!isAuthorizedFaculty && !isStudent) {
      throw new AppError('You do not have permission to view viva questions for this submission', 403);
    }

    // Check if questions already exist
    let questions = await evaluationRepository.getGeneratedVivaQuestions(submissionId);

    if (!questions || questions.length === 0) {
      if (isAuthorizedFaculty) {
        // Auto-generate for evaluator convenience
        const generated = await defaultAIProvider.generateVivaQuestions(submission);
        questions = await evaluationRepository.saveGeneratedVivaQuestions(submissionId, generated);
      } else {
        throw new AppError('Viva questions have not been generated yet for this submission', 400);
      }
    }

    return {
      submissionId,
      totalQuestions: questions.length,
      maxTotalMarks: 25,
      questions: questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        category: q.category,
        maxMarks: q.maxScore,
      })),
    };
  }

  /**
   * Award viva marks (0-5 marks per question, total <= 25)
   * Manual grading by faculty/coordinator/owner. AI does NOT automatically assign marks.
   */
  async submitVivaMarks(
    submissionId: string,
    evaluator: { id: string; role?: string },
    data: SubmitVivaMarksInput
  ) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    if (!this.isEvaluatorOrOwner(submission, evaluator.id, evaluator.role)) {
      throw new AppError('Only assigned evaluators or classroom owners can award viva marks', 403);
    }

    if (!data.vivaQuestions || data.vivaQuestions.length !== 5) {
      throw new AppError('Viva evaluation must comprise exactly 5 question evaluations', 400);
    }

    let vivaTotalScore = 0;
    for (const q of data.vivaQuestions) {
      if (q.score < 0 || q.score > 5) {
        throw new AppError(`Marks for question #${q.questionNumber} must be between 0 and 5`, 400);
      }
      vivaTotalScore += q.score;
    }

    if (vivaTotalScore > 25) {
      throw new AppError(`Total viva score cannot exceed 25 marks. Given sum: ${vivaTotalScore}`, 400);
    }

    // Round viva score to 1 decimal place
    vivaTotalScore = Math.round(vivaTotalScore * 10) / 10;

    // Retain or set PPT/Demo score (max 25)
    let pptDemoScore = 0;
    if (data.pptDemoScore !== undefined) {
      pptDemoScore = Math.min(25, Math.max(0, data.pptDemoScore));
    } else if (submission.facultyEvaluation?.pptDemoScore !== undefined) {
      pptDemoScore = submission.facultyEvaluation.pptDemoScore;
    }

    const totalFacultyScore = Math.min(50, pptDemoScore + vivaTotalScore);

    // Save faculty evaluation with 5 viva question responses
    const facultyEval = await evaluationRepository.saveFacultyEvaluation({
      submissionId,
      evaluatorId: evaluator.id,
      pptDemoScore,
      vivaTotalScore,
      totalFacultyScore,
      status: data.status,
      reason: data.reason,
      feedback: data.feedback,
      vivaQuestions: data.vivaQuestions.map((q) => ({
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        category: q.category,
        score: q.score,
        feedback: q.feedback,
      })),
    });

    // Authoritative Final Classroom Score Calculation:
    // AI /50 + PPT/Demo /25 + Viva /25 = Final /100
    const aiEvaluation = await evaluationRepository.findAIEvaluationBySubmissionId(submissionId);
    const aiScore = aiEvaluation ? aiEvaluation.finalScore : 0;

    let finalTotalScore = aiScore + totalFacultyScore;
    finalTotalScore = Math.min(100, Math.max(0, Math.round(finalTotalScore * 10) / 10));

    // Update submission record
    await submissionRepository.updateFinalScore(submissionId, finalTotalScore);
    await submissionRepository.updateStatus(submissionId, 'Faculty_Evaluated');

    // Notify submitter
    await notificationService.notify(
      submission.submitterId,
      'viva_evaluated',
      'Viva Evaluation Completed',
      `Viva evaluation for "${submission.title}" has been recorded. Viva Score: ${vivaTotalScore}/25. Total Final Score: ${finalTotalScore}/100.`,
      `/submissions/${submissionId}`
    );

    return {
      submissionId,
      status: 'Faculty_Evaluated',
      vivaTotalScore,
      maxVivaScore: 25,
      pptDemoScore,
      totalFacultyScore,
      finalTotalScore,
      scores: {
        aiScoreOutof50: aiScore,
        pptDemoScoreOutof25: pptDemoScore,
        vivaScoreOutof25: vivaTotalScore,
        finalTotalScoreOutof100: finalTotalScore,
      },
      evaluation: facultyEval,
    };
  }

  /**
   * Get viva result
   * Evaluator/Owner can view anytime. Students can only view their own submission once evaluated.
   */
  async getVivaResult(submissionId: string, user: { id: string; role?: string }) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const isAuthorizedFaculty = this.isEvaluatorOrOwner(submission, user.id, user.role);
    const isStudent = this.isStudentOfSubmission(submission, user.id);

    if (!isAuthorizedFaculty && !isStudent) {
      throw new AppError('You do not have permission to view viva results for this submission', 403);
    }

    const facultyEval = submission.facultyEvaluation;
    if (!facultyEval) {
      if (isStudent) {
        throw new AppError('Viva evaluation results are not yet available', 400);
      } else {
        throw new AppError('Viva evaluation has not been conducted yet for this submission', 404);
      }
    }

    return {
      submissionId: submission.id,
      title: submission.title,
      status: submission.status,
      evaluator: facultyEval.evaluator,
      evaluatedAt: facultyEval.evaluatedAt,
      vivaTotalScore: facultyEval.vivaTotalScore,
      maxVivaScore: 25,
      pptDemoScore: facultyEval.pptDemoScore,
      totalFacultyScore: facultyEval.totalFacultyScore,
      evaluationStatus: facultyEval.status,
      reason: facultyEval.reason,
      feedback: facultyEval.feedback,
      questions: facultyEval.vivaResponses.map((r: any) => ({
        id: r.id,
        questionNumber: r.questionNumber,
        questionText: r.questionText,
        category: r.category,
        maxMarks: r.maxScore,
        awardedMarks: r.score,
        feedback: r.feedback,
      })),
      scores: {
        aiScoreOutof50: submission.aiEvaluation?.finalScore ?? 0,
        pptDemoScoreOutof25: facultyEval.pptDemoScore,
        vivaScoreOutof25: facultyEval.vivaTotalScore,
        finalTotalScoreOutof100:
          submission.finalTotalScore ??
          Math.min(100, (submission.aiEvaluation?.finalScore ?? 0) + facultyEval.totalFacultyScore),
      },
    };
  }
}

export const vivaService = new VivaService();

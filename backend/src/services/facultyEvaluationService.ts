import { evaluationRepository } from '../repositories/evaluationRepository';
import { submissionRepository } from '../repositories/submissionRepository';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorMiddleware';

const DEFAULT_VIVA_QUESTIONS = [
  {
    questionNumber: 1,
    questionText: 'Architecture & Scalability: Explain the architectural choices, decoupling of layers, and how your system scales.',
    maxScore: 5,
  },
  {
    questionNumber: 2,
    questionText: 'Core Problem & Novelty: How does your implementation uniquely solve the targeted problem compared to existing solutions?',
    maxScore: 5,
  },
  {
    questionNumber: 3,
    questionText: 'Security & Error Handling: What security measures and error boundaries have been implemented across client and server?',
    maxScore: 5,
  },
  {
    questionNumber: 4,
    questionText: 'Data Modeling & Integrity: Explain your database schema design, relationships, and constraint strategies.',
    maxScore: 5,
  },
  {
    questionNumber: 5,
    questionText: 'Testing & Future Scope: Detail your automated testing strategies, current limitations, and planned future enhancements.',
    maxScore: 5,
  },
];

export class FacultyEvaluationService {
  async getVivaQuestions(submissionId: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    const existingEvaluation = await evaluationRepository.findFacultyEvaluationBySubmissionId(submissionId);
    if (existingEvaluation && existingEvaluation.vivaResponses.length > 0) {
      return existingEvaluation.vivaResponses;
    }

    return DEFAULT_VIVA_QUESTIONS;
  }

  async submitFacultyEvaluation(
    submissionId: string,
    evaluatorId: string,
    data: {
      pptDemoScore: number;
      vivaQuestions: Array<{
        questionNumber: number;
        questionText: string;
        score: number;
        feedback?: string;
      }>;
      status: 'Completed' | 'Incomplete' | 'Absent';
      reason?: string;
      feedback: string;
    }
  ) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Validate 5 questions
    if (data.vivaQuestions.length !== 5) {
      throw new AppError('Viva evaluation must comprise exactly 5 questions', 400);
    }

    // Calculate viva sum (max 25)
    let vivaTotalScore = 0;
    for (const q of data.vivaQuestions) {
      if (q.score < 0 || q.score > 5) {
        throw new AppError(`Score for question #${q.questionNumber} must be between 0 and 5`, 400);
      }
      vivaTotalScore += q.score;
    }
    vivaTotalScore = Math.min(25, vivaTotalScore);

    // PPT/Demo max 25
    const pptDemoScore = Math.min(25, Math.max(0, data.pptDemoScore));

    // Faculty total = max 50
    const totalFacultyScore = Math.min(50, pptDemoScore + vivaTotalScore);

    // Save faculty evaluation
    const facultyEval = await evaluationRepository.saveFacultyEvaluation({
      submissionId,
      evaluatorId,
      pptDemoScore,
      vivaTotalScore,
      totalFacultyScore,
      status: data.status,
      reason: data.reason,
      feedback: data.feedback,
      vivaQuestions: data.vivaQuestions,
    });

    // Authoritative Final Classroom Score Calculation:
    // AI /50 + PPT/Demo /25 + Viva /25 = Final /100
    const aiEvaluation = await evaluationRepository.findAIEvaluationBySubmissionId(submissionId);
    const aiScore = aiEvaluation ? aiEvaluation.finalScore : 0;

    let finalTotalScore = aiScore + totalFacultyScore;
    finalTotalScore = Math.min(100, Math.max(0, Math.round(finalTotalScore * 10) / 10));

    // Update submission record with authoritative final score and status
    await submissionRepository.updateFinalScore(submissionId, finalTotalScore);
    await submissionRepository.updateStatus(submissionId, 'Faculty_Evaluated');

    // Notify submitter and classroom owner
    await notificationService.notify(
      submission.submitterId,
      'faculty_evaluated',
      'Faculty Evaluation Completed',
      `Faculty evaluation for "${submission.title}" has been recorded. Final Score: ${finalTotalScore}/100.`,
      `/submissions/${submissionId}`
    );

    return {
      evaluation: facultyEval,
      authoritativeScores: {
        aiScoreOutof50: aiScore,
        pptDemoScoreOutof25: pptDemoScore,
        vivaScoreOutof25: vivaTotalScore,
        finalTotalScoreOutof100: finalTotalScore,
      },
    };
  }
}

export const facultyEvaluationService = new FacultyEvaluationService();

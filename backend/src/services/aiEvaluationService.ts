import { evaluationRepository } from '../repositories/evaluationRepository';
import { submissionRepository } from '../repositories/submissionRepository';
import { defaultAIProvider } from '../integrations/ai/MockAIProvider';
import { defaultPlagiarismProvider } from '../integrations/plagiarism/MockPlagiarismProvider';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorMiddleware';

export class AIEvaluationService {
  async evaluateSubmission(submissionId: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Run Plagiarism analysis first
    const plagiarismResult = await defaultPlagiarismProvider.analyzeFullSubmission(
      submission.githubUrl,
      submission.description
    );

    // Run AI Evaluation (max 50, incorporating plagiarism deduction directly into finalScore)
    const aiResult = await defaultAIProvider.evaluateClassroomSubmission(
      submission,
      plagiarismResult
    );

    // Store Classroom AI Evaluation
    const saved = await evaluationRepository.upsertAIEvaluation({
      submissionId,
      rawScore: aiResult.rawScore,
      codeSimilarity: aiResult.codeSimilarity,
      reportSimilarity: aiResult.reportSimilarity,
      overallSimilarity: aiResult.overallSimilarity,
      deduction: aiResult.deduction,
      finalScore: aiResult.finalScore,
      plagiarismStatus: aiResult.plagiarismStatus,
      plagiarismReason: aiResult.plagiarismReason,
      matchedSources: aiResult.matchedSources,
      feedback: aiResult.feedback,
      improvementPlan: aiResult.improvementPlan,
      isDemoData: aiResult.isDemoData,
    });

    // Update submission status
    await submissionRepository.updateStatus(submissionId, 'AI_Evaluated');

    // Notify submitter
    await notificationService.notify(
      submission.submitterId,
      'ai_evaluated',
      'AI Evaluation Complete',
      `AI evaluation completed for "${submission.title}". Score: ${aiResult.finalScore}/50.`,
      `/submissions/${submissionId}`
    );

    return saved;
  }

  async getAIEvaluation(submissionId: string) {
    const evaluation = await evaluationRepository.findAIEvaluationBySubmissionId(submissionId);
    if (!evaluation) {
      throw new AppError('AI evaluation not found for this submission', 404);
    }
    return evaluation;
  }
}

export const aiEvaluationService = new AIEvaluationService();

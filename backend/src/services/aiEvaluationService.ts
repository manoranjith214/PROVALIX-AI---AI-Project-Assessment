import { evaluationRepository } from '../repositories/evaluationRepository';
import { submissionRepository } from '../repositories/submissionRepository';
import { getAIProvider } from '../integrations/ai';
import { runPlagiarismPipeline } from '../integrations/plagiarism';
import { evidenceAnalyzer } from '../integrations/rubric/evidenceAnalyzer';
import { notificationService } from './notificationService';
import { AppError } from '../middleware/errorMiddleware';

export class AIEvaluationService {
  async evaluateSubmission(submissionId: string, currentUserId?: string) {
    const submission = await submissionRepository.findById(submissionId);
    if (!submission) {
      throw new AppError('Submission not found', 404);
    }

    // Role check: Only assigned evaluators or the classroom owner can trigger AI evaluation
    if (currentUserId) {
      const classroom = submission.classroom;
      const isOwner = classroom.ownerId === currentUserId;
      const isAssigned = submission.assignedEvaluatorId === currentUserId;
      const isEvaluator = classroom.evaluators?.some((e: any) => e.evaluatorId === currentUserId);

      if (!isOwner && !isAssigned && !isEvaluator) {
        throw new AppError('Only the classroom owner or assigned evaluators can trigger AI evaluation', 403);
      }
    }

    // Check classroom's required resources configuration
    const classroom = submission.classroom;
    const requiredResources: string[] = [];
    if (classroom?.resourcesConfig) {
      try {
        const parsed = JSON.parse(classroom.resourcesConfig);
        if (Array.isArray(parsed)) {
          for (const r of parsed) {
            if (r.required) requiredResources.push(r.type);
          }
        }
      } catch {}
    }

    // 1. STRICT EVIDENCE VALIDATION LAYER (Requirement 8 & 9)
    const validationCheck = evidenceAnalyzer.validateClassroomSubmission(submission, requiredResources);
    if (!validationCheck.isValid) {
      const err: any = new AppError(
        validationCheck.reason || 'Insufficient project evidence for evaluation.',
        400
      );
      err.status = 'BLOCKED_MISSING_EVIDENCE';
      err.missingResources = validationCheck.missingEvidence || [];
      throw err;
    }

    // 2. EVIDENCE ANALYSIS (Requirement 4 & 5)
    const evidenceAnalysis = evidenceAnalyzer.extractAndClassifyEvidence(submission);

    // 3. Complete Plagiarism Pipeline: Extraction -> Normalization -> Provider -> Analysis
    const plagiarismResult = await runPlagiarismPipeline({
      submissionOrProject: submission,
      resources: submission.resources,
      githubUrl: submission.githubUrl || undefined,
      description: submission.description || undefined,
    });

    // 4. Run AI Evaluation (max 50, incorporating plagiarism deduction directly into finalScore)
    const aiProvider = getAIProvider();
    const aiResult = await aiProvider.evaluateClassroomSubmission(
      submission,
      plagiarismResult,
      evidenceAnalysis
    );

    // 5. VALIDATE AI RESULTS BEFORE PERSISTING (Requirement 18)
    if (
      typeof aiResult.rawScore !== 'number' ||
      isNaN(aiResult.rawScore) ||
      typeof aiResult.finalScore !== 'number' ||
      isNaN(aiResult.finalScore) ||
      aiResult.rawScore < 0 ||
      aiResult.rawScore > 50
    ) {
      throw new AppError('AI evaluation returned an invalid score payload. Please try again.', 502);
    }

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
      isDemoData: plagiarismResult.isDemoData || (aiResult.isDemoData ?? false),
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

  async getAIEvaluation(submissionId: string, currentUserId?: string) {
    if (currentUserId) {
      const submission = await submissionRepository.findById(submissionId);
      if (!submission) {
        throw new AppError('Submission not found', 404);
      }

      const classroom = submission.classroom;
      const isOwner = classroom.ownerId === currentUserId;
      const isAssigned = submission.assignedEvaluatorId === currentUserId;
      const isEvaluator = classroom.evaluators?.some((e: any) => e.evaluatorId === currentUserId);
      const isSubmitter = submission.submitterId === currentUserId;
      const isTeamMember = submission.team?.members?.some((m: any) => m.userId === currentUserId || m.user?.id === currentUserId);

      if (!isOwner && !isAssigned && !isEvaluator && !isSubmitter && !isTeamMember) {
        throw new AppError('You do not have permission to view this evaluation', 403);
      }
    }

    const evaluation = await evaluationRepository.findAIEvaluationBySubmissionId(submissionId);
    if (!evaluation) {
      throw new AppError('AI evaluation not found for this submission', 404);
    }
    return evaluation;
  }
}

export const aiEvaluationService = new AIEvaluationService();

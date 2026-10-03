import { projectCheckerRepository } from '../repositories/projectCheckerRepository';
import { getAIProvider } from '../integrations/ai';
import { runPlagiarismPipeline } from '../integrations/plagiarism';
import { getStorageProvider } from '../integrations/storage';
import { evidenceAnalyzer } from '../integrations/rubric/evidenceAnalyzer';
import { rubricEngine } from '../integrations/rubric/rubricEngine';
import { sourceCodeAnalyzer } from './sourceCodeAnalyzer';
import { validateAndCalculateProjectCheckerScores } from '../validators/aiEvaluationValidator';
import { pdfReportGenerator } from './pdfReportGenerator';
import { PaginationParams } from '../types';
import { AppError } from '../middleware/errorMiddleware';

export class ProjectCheckerService {
  async createProject(userId: string, data: any) {
    return projectCheckerRepository.create({
      ...data,
      userId,
    });
  }

  async listUserProjects(userId: string, params: PaginationParams) {
    return projectCheckerRepository.listByUser(userId, params);
  }

  async getProjectById(projectId: string, userId: string) {
    const project = await projectCheckerRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    if (project.userId !== userId) {
      throw new AppError('Unauthorized to view this project', 403);
    }
    return project;
  }

  async updateProject(projectId: string, userId: string, data: any) {
    await this.getProjectById(projectId, userId);
    return projectCheckerRepository.update(projectId, data);
  }

  async deleteProject(projectId: string, userId: string) {
    await this.getProjectById(projectId, userId);
    await projectCheckerRepository.delete(projectId);
    return { message: 'Project deleted successfully' };
  }

  async addResource(projectId: string, userId: string, file: Express.Multer.File, type: string) {
    await this.getProjectById(projectId, userId);
    const storageProvider = getStorageProvider();
    const stored = await storageProvider.saveFile(file, `project-checker/${projectId}`, { isPrivate: true });

    return projectCheckerRepository.addResource({
      projectId,
      type: type || 'other',
      name: file.originalname,
      url: stored.url,
      path: stored.storagePath,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      uploadedById: userId,
    });
  }

  async runPlagiarismCheck(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    const plagiarismResult = await runPlagiarismPipeline({
      submissionOrProject: project,
      resources: project.resources,
      githubUrl: project.githubUrl || undefined,
      description: project.description || undefined,
    });

    return projectCheckerRepository.upsertPlagiarism({
      projectId,
      codeSimilarity: plagiarismResult.codeSimilarity,
      reportSimilarity: plagiarismResult.reportSimilarity,
      overallSimilarity: plagiarismResult.overallSimilarity,
      status: plagiarismResult.status,
      matchedSources: plagiarismResult.matchedSources,
      deduction: plagiarismResult.deduction,
      reason: plagiarismResult.reason,
      feedback: plagiarismResult.feedback,
      isDemoData: plagiarismResult.isDemoData,
    });
  }

  async runAIEvaluation(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    // 1. STRICT VALIDATION LAYER (Requirement 1)
    // Validate project information and evidence presence before ANY AI analysis
    const validationCheck = evidenceAnalyzer.validateProjectSubmission(project);
    if (!validationCheck.isValid) {
      throw new AppError(
        validationCheck.reason || 'Insufficient project evidence for evaluation.',
        400
      );
    }

    // 2. REAL SOURCE CODE INSPECTION (Requirement 4)
    const sourceAnalysis = await sourceCodeAnalyzer.analyzeProjectSource(project);

    // 3. EVIDENCE ANALYSIS (Requirement 2 & 5)
    const evidenceAnalysis = evidenceAnalyzer.extractAndClassifyEvidence(project);
    if (sourceAnalysis.sourceAvailable) {
      evidenceAnalysis.verifiedEvidence.push(sourceAnalysis.summary);
      if (sourceAnalysis.hasTests) {
        evidenceAnalysis.verifiedEvidence.push(`Automated test suites detected: ${sourceAnalysis.testFileCount} test file(s)`);
      } else {
        evidenceAnalysis.missingEvidence.push('Automated test files or suites not found in repository archive');
      }
      if (sourceAnalysis.dependencies.length > 0) {
        evidenceAnalysis.verifiedEvidence.push(`Verified dependencies: ${sourceAnalysis.dependencies.slice(0, 10).join(', ')}`);
      }
      for (const smell of sourceAnalysis.codeSmells) {
        evidenceAnalysis.inconsistencies.push(`Code issue in ${smell.file}: ${smell.message}`);
      }
    } else {
      evidenceAnalysis.missingEvidence.push('Source code archive not submitted or unreadable from storage');
    }

    // 4. Get or run plagiarism check first
    let plagiarism = project.plagiarism;
    if (!plagiarism) {
      plagiarism = await this.runPlagiarismCheck(projectId, userId);
    }

    // 5. Run AI Evaluation with structured evidence and real source code inspection
    const aiProvider = getAIProvider();
    const aiResult = await aiProvider.evaluateProject(project, plagiarism, {
      ...evidenceAnalysis,
      sourceAnalysis,
    });

    // 6. STRICT VALIDATION LAYER & BACKEND SCORE CALCULATION (Requirement 2, 3, 18)
    const validatedEval = validateAndCalculateProjectCheckerScores(aiResult);

    return projectCheckerRepository.upsertAIEvaluation({
      projectId,
      problemDefinitionScore: validatedEval.criteria.problemDefinition.score,
      problemDefinitionFeedback: validatedEval.criteria.problemDefinition.feedback,
      innovationNoveltyScore: validatedEval.criteria.innovationNovelty.score,
      innovationNoveltyFeedback: validatedEval.criteria.innovationNovelty.feedback,
      technicalImplementationScore: validatedEval.criteria.technicalImplementation.score,
      technicalImplementationFeedback: validatedEval.criteria.technicalImplementation.feedback,
      functionalityScore: validatedEval.criteria.functionality.score,
      functionalityFeedback: validatedEval.criteria.functionality.feedback,
      codeQualityScore: validatedEval.criteria.codeQuality.score,
      codeQualityFeedback: validatedEval.criteria.codeQuality.feedback,
      documentationScore: validatedEval.criteria.documentation.score,
      documentationFeedback: validatedEval.criteria.documentation.feedback,
      overallQualityScore: validatedEval.criteria.overallQuality.score,
      overallQualityFeedback: validatedEval.criteria.overallQuality.feedback,
      totalScore: validatedEval.totalScore,
      strengths: validatedEval.strengths,
      weaknesses: validatedEval.weaknesses,
      technicalAnalysis: validatedEval.technicalAnalysis,
      codeAnalysis: validatedEval.codeAnalysis,
      documentationAnalysis: validatedEval.documentationAnalysis,
      actionableSuggestions: validatedEval.actionableSuggestions,
      improvementPlan: validatedEval.improvementPlan,
      summary: validatedEval.summary,
      aiModel: aiResult.aiModel || 'Gemini 2.5 Flash',
      isDemoData: false,
    });
  }

  async generateReport(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    if (!project.aiEvaluation) {
      await this.runAIEvaluation(projectId, userId);
    }

    return this.getReport(projectId, userId);
  }

  async getReport(projectId: string, userId: string) {
    const project = await this.getProjectById(projectId, userId);

    if (!project.aiEvaluation) {
      throw new AppError('Report not yet generated. Please trigger AI evaluation first.', 400);
    }

    const ai = project.aiEvaluation;
    const plag = project.plagiarism;

    // Build structured report object completely independent of classroom marks
    return {
      reportType: 'PROJECT_CHECKER_STANDALONE_EVALUATION',
      project: {
        id: project.id,
        title: project.title,
        category: project.category,
        description: project.description,
        problemStatement: project.problemStatement,
        proposedSolution: project.proposedSolution,
        objectives: project.objectives,
        innovation: project.innovation,
        features: project.features,
        targetUsers: project.targetUsers,
        technologies: project.technologies ? JSON.parse(project.technologies) : [],
        programmingLanguages: project.programmingLanguages ? JSON.parse(project.programmingLanguages) : [],
        testingApproach: project.testingApproach,
        limitations: project.limitations,
        futureEnhancements: project.futureEnhancements,
        githubUrl: project.githubUrl,
        liveDemoUrl: project.liveDemoUrl,
        resources: project.resources,
      },
      plagiarism: plag
        ? {
            codeSimilarity: plag.codeSimilarity,
            reportSimilarity: plag.reportSimilarity,
            overallSimilarity: plag.overallSimilarity,
            status: plag.status,
            deduction: plag.deduction,
            reason: plag.reason,
            feedback: plag.feedback,
            matchedSources: plag.matchedSources ? JSON.parse(plag.matchedSources) : [],
          }
        : null,
      aiEvaluation: {
        totalScoreOutof100: ai.totalScore,
        criteria: {
          problemDefinition: {
            maxScore: 15,
            score: ai.problemDefinitionScore,
            feedback: ai.problemDefinitionFeedback,
          },
          innovationNovelty: {
            maxScore: 20,
            score: ai.innovationNoveltyScore,
            feedback: ai.innovationNoveltyFeedback,
          },
          technicalImplementation: {
            maxScore: 20,
            score: ai.technicalImplementationScore,
            feedback: ai.technicalImplementationFeedback,
          },
          functionality: {
            maxScore: 15,
            score: ai.functionalityScore,
            feedback: ai.functionalityFeedback,
          },
          codeQuality: {
            maxScore: 10,
            score: ai.codeQualityScore,
            feedback: ai.codeQualityFeedback,
          },
          documentation: {
            maxScore: 10,
            score: ai.documentationScore,
            feedback: ai.documentationFeedback,
          },
          overallQuality: {
            maxScore: 10,
            score: ai.overallQualityScore,
            feedback: ai.overallQualityFeedback,
          },
        },
        strengths: JSON.parse(ai.strengths),
        weaknesses: JSON.parse(ai.weaknesses),
        technicalAnalysis: ai.technicalAnalysis,
        codeAnalysis: ai.codeAnalysis,
        documentationAnalysis: ai.documentationAnalysis,
        actionableSuggestions: ai.actionableSuggestions ? JSON.parse(ai.actionableSuggestions) : [],
        improvementPlan: JSON.parse(ai.improvementPlan),
        summary: ai.summary,
        aiModel: ai.aiModel,
        evaluatedAt: ai.evaluatedAt,
      },
    };
  }

  async getPdfReport(projectId: string, userId: string) {
    const report = await this.getReport(projectId, userId);

    // Return structured markdown document that can be streamed as PDF/Markdown text
    const md = `
# Provalix AI - Project Checker Comprehensive Evaluation Report
**Project Title**: ${report.project.title}
**Category**: ${report.project.category || 'N/A'}
**Overall AI Score**: ${report.aiEvaluation.totalScoreOutof100} / 100
**Evaluation Timestamp**: ${new Date(report.aiEvaluation.evaluatedAt).toLocaleString()}
**Evaluation Engine**: ${report.aiEvaluation.aiModel}

---

## 1. Executive Summary
${report.aiEvaluation.summary || 'Project successfully analyzed across 7 key engineering and novelty dimensions.'}

## 2. Plagiarism & Integrity Analysis
- **Code Similarity**: ${report.plagiarism?.codeSimilarity ?? 0}%
- **Report Similarity**: ${report.plagiarism?.reportSimilarity ?? 0}%
- **Overall Similarity**: ${report.plagiarism?.overallSimilarity ?? 0}%
- **Status**: ${report.plagiarism?.status ?? 'Low'}
- **Integrity Feedback**: ${report.plagiarism?.feedback || 'Academic integrity verified.'}

## 3. Criterion-Wise Score Breakdown (/100)
| Criterion | Max Score | Obtained Score | Feedback |
| :--- | :---: | :---: | :--- |
| Problem Definition | 15 | ${report.aiEvaluation.criteria.problemDefinition.score} | ${report.aiEvaluation.criteria.problemDefinition.feedback} |
| Innovation & Novelty | 20 | ${report.aiEvaluation.criteria.innovationNovelty.score} | ${report.aiEvaluation.criteria.innovationNovelty.feedback} |
| Technical Implementation | 20 | ${report.aiEvaluation.criteria.technicalImplementation.score} | ${report.aiEvaluation.criteria.technicalImplementation.feedback} |
| Functionality | 15 | ${report.aiEvaluation.criteria.functionality.score} | ${report.aiEvaluation.criteria.functionality.feedback} |
| Code Quality | 10 | ${report.aiEvaluation.criteria.codeQuality.score} | ${report.aiEvaluation.criteria.codeQuality.feedback} |
| Documentation | 10 | ${report.aiEvaluation.criteria.documentation.score} | ${report.aiEvaluation.criteria.documentation.feedback} |
| Overall Quality | 10 | ${report.aiEvaluation.criteria.overallQuality.score} | ${report.aiEvaluation.criteria.overallQuality.feedback} |
| **TOTAL** | **100** | **${report.aiEvaluation.totalScoreOutof100}** | |

## 4. Strengths
${report.aiEvaluation.strengths.map((s: string) => `- ${s}`).join('\n')}

## 5. Areas for Improvement
${report.aiEvaluation.weaknesses.map((w: string) => `- ${w}`).join('\n')}

## 6. Technical & Code Analysis
${report.aiEvaluation.technicalAnalysis}

${report.aiEvaluation.codeAnalysis}

## 7. Phased Improvement Plan
${report.aiEvaluation.improvementPlan
  .map(
    (item: any, i: number) =>
      `### Phase ${i + 1}: ${item.area} [Priority: ${item.priority}]\n${item.suggestion}`
  )
  .join('\n\n')}
`;
    return { markdown: md, report };
  }

  async generatePdfBuffer(projectId: string, userId: string): Promise<Buffer> {
    const report = await this.getReport(projectId, userId);
    return pdfReportGenerator.generateProjectPdf(report as any);
  }
}

export const projectCheckerService = new ProjectCheckerService();

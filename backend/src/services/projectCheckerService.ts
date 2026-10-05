import 'multer';
import { projectCheckerRepository } from '../repositories/projectCheckerRepository';
import { getAIProvider } from '../integrations/ai';
import { runPlagiarismPipeline } from '../integrations/plagiarism';
import { getStorageProvider } from '../integrations/storage';
import { evidenceAnalyzer } from '../integrations/rubric/evidenceAnalyzer';
import { rubricEngine } from '../integrations/rubric/rubricEngine';
import { sourceCodeAnalyzer } from './sourceCodeAnalyzer';
import { validateAndCalculateProjectCheckerScores } from '../validators/aiEvaluationValidator';
import { pdfReportGenerator } from './pdfReportGenerator';
import { prisma } from '../config/prisma';
import { PaginationParams } from '../types';
import { AppError } from '../middleware/errorMiddleware';

export class ProjectCheckerService {
  async createProject(userId: string, data: any) {
    const { id, draftId, ...payload } = data;
    const targetId = id || draftId;

    if (targetId) {
      const existing = await projectCheckerRepository.findById(targetId);
      if (existing && existing.userId === userId && !existing.aiEvaluation) {
        return this.updateProject(existing.id, userId, payload);
      }
    }

    // Check if an existing unevaluated draft project exists for this user with the same title
    if (payload.title) {
      const existingDraft = await projectCheckerRepository.findDraftByTitle(userId, payload.title);

      // Ensure demo project or evaluated project is never overwritten as a draft
      if (existingDraft && !existingDraft.title.includes('Smart Campus Attendance')) {
        return this.updateProject(existingDraft.id, userId, payload);
      }
    }

    return projectCheckerRepository.create({
      ...payload,
      userId,
    });
  }

  async listUserProjects(userId: string, params?: Partial<PaginationParams>) {
    const pagination: PaginationParams = {
      page: params?.page || 1,
      limit: params?.limit || 10,
    };
    const { total, projects } = await projectCheckerRepository.listByUser(userId, pagination);
    const enriched = projects.map(p => ({
      ...p,
      overallScore: (p as any).aiEvaluation?.totalScore ?? null,
      similarityScore: (p as any).plagiarism?.overallSimilarity ?? null,
    }));
    return { total, projects: enriched };
  }

  async getProjectById(projectId: string, userId?: string) {
    if (!projectId || typeof projectId !== 'string' || projectId.trim() === '') {
      throw new AppError('Project not found', 404);
    }
    const project = await projectCheckerRepository.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }
    if (userId && project.userId !== userId) {
      throw new AppError('Unauthorized to view this project', 403);
    }
    return {
      ...project,
      overallScore: (project as any).aiEvaluation?.totalScore ?? null,
      similarityScore: (project as any).plagiarism?.overallSimilarity ?? null,
    };
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

    const safeJsonParse = (val: any, fallback: any = []) => {
      if (!val) return fallback;
      if (typeof val !== 'string') return val;
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    const criteriaObj = {
      problemDefinition: {
        name: 'Problem Definition',
        maxScore: 15,
        score: ai.problemDefinitionScore,
        obtainedScore: ai.problemDefinitionScore,
        feedback: ai.problemDefinitionFeedback || '',
      },
      innovationNovelty: {
        name: 'Innovation & Novelty',
        maxScore: 20,
        score: ai.innovationNoveltyScore,
        obtainedScore: ai.innovationNoveltyScore,
        feedback: ai.innovationNoveltyFeedback || '',
      },
      technicalImplementation: {
        name: 'Technical Implementation',
        maxScore: 20,
        score: ai.technicalImplementationScore,
        obtainedScore: ai.technicalImplementationScore,
        feedback: ai.technicalImplementationFeedback || '',
      },
      functionality: {
        name: 'Functionality',
        maxScore: 15,
        score: ai.functionalityScore,
        obtainedScore: ai.functionalityScore,
        feedback: ai.functionalityFeedback || '',
      },
      codeQuality: {
        name: 'Code Quality',
        maxScore: 10,
        score: ai.codeQualityScore,
        obtainedScore: ai.codeQualityScore,
        feedback: ai.codeQualityFeedback || '',
      },
      documentation: {
        name: 'Documentation',
        maxScore: 10,
        score: ai.documentationScore,
        obtainedScore: ai.documentationScore,
        feedback: ai.documentationFeedback || '',
      },
      overallQuality: {
        name: 'Overall Project Quality',
        maxScore: 10,
        score: ai.overallQualityScore,
        obtainedScore: ai.overallQualityScore,
        feedback: ai.overallQualityFeedback || '',
      },
    };

    const plagiarismObj = plag
      ? {
          id: plag.id,
          codeSimilarity: plag.codeSimilarity,
          reportSimilarity: plag.reportSimilarity,
          overallSimilarity: plag.overallSimilarity,
          similarityScore: plag.overallSimilarity,
          similarityPercent: plag.overallSimilarity,
          status: plag.status,
          deduction: plag.deduction ?? 0,
          reason: plag.reason || null,
          feedback: plag.feedback || '',
          matchedSources: safeJsonParse(plag.matchedSources, []),
          isDemoData: plag.isDemoData ?? false,
        }
      : {
          codeSimilarity: 0,
          reportSimilarity: 0,
          overallSimilarity: 0,
          similarityScore: 0,
          similarityPercent: 0,
          status: 'Low',
          deduction: 0,
          reason: null,
          feedback: 'No significant plagiarism detected.',
          matchedSources: [],
          isDemoData: false,
        };

    const evaluationObj = {
      id: ai.id || `eval_${project.id}`,
      projectId: project.id,
      overallScore: ai.totalScore,
      totalScore: ai.totalScore,
      totalScoreOutof100: ai.totalScore,
      criteria: criteriaObj,
      problemDefinitionScore: ai.problemDefinitionScore,
      problemDefinitionFeedback: ai.problemDefinitionFeedback || '',
      innovationNoveltyScore: ai.innovationNoveltyScore,
      innovationNoveltyFeedback: ai.innovationNoveltyFeedback || '',
      technicalImplementationScore: ai.technicalImplementationScore,
      technicalImplementationFeedback: ai.technicalImplementationFeedback || '',
      functionalityScore: ai.functionalityScore,
      functionalityFeedback: ai.functionalityFeedback || '',
      codeQualityScore: ai.codeQualityScore,
      codeQualityFeedback: ai.codeQualityFeedback || '',
      documentationScore: ai.documentationScore,
      documentationFeedback: ai.documentationFeedback || '',
      overallQualityScore: ai.overallQualityScore,
      overallQualityFeedback: ai.overallQualityFeedback || '',
      strengths: safeJsonParse(ai.strengths, []),
      weaknesses: safeJsonParse(ai.weaknesses, []),
      technicalAnalysis: ai.technicalAnalysis || '',
      codeAnalysis: ai.codeAnalysis || '',
      documentationAnalysis: ai.documentationAnalysis || '',
      actionableSuggestions: safeJsonParse(ai.actionableSuggestions, []),
      improvementPlan: safeJsonParse(ai.improvementPlan, []),
      summary: ai.summary || '',
      aiModel: ai.aiModel || 'gemini-3.8-flash',
      evaluatedAt: ai.evaluatedAt || new Date().toISOString(),
      plagiarism: plagiarismObj,
    };

    return {
      reportType: 'PROJECT_CHECKER_STANDALONE_EVALUATION',
      overallScore: ai.totalScore,
      similarityScore: plagiarismObj.overallSimilarity,
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
        technologies: safeJsonParse(project.technologies, []),
        programmingLanguages: safeJsonParse(project.programmingLanguages, []),
        testingApproach: project.testingApproach,
        limitations: project.limitations,
        futureEnhancements: project.futureEnhancements,
        githubUrl: project.githubUrl,
        liveDemoUrl: project.liveDemoUrl,
        resources: project.resources,
        overallScore: ai.totalScore,
        similarityScore: plagiarismObj.overallSimilarity,
        status: (project as any).status || 'Evaluated',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      plagiarism: plagiarismObj,
      aiEvaluation: evaluationObj,
      evaluation: evaluationObj,
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

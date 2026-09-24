import { projectCheckerRepository } from '../repositories/projectCheckerRepository';
import { defaultAIProvider } from '../integrations/ai/MockAIProvider';
import { defaultPlagiarismProvider } from '../integrations/plagiarism/MockPlagiarismProvider';
import { defaultStorageProvider } from '../integrations/storage/LocalStorageProvider';
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
    const stored = await defaultStorageProvider.saveFile(file, `project-checker/${projectId}`);

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

    const plagiarismResult = await defaultPlagiarismProvider.analyzeFullSubmission(
      project.githubUrl,
      project.description
    );

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

    // Get or run plagiarism check first
    let plagiarism = project.plagiarism;
    if (!plagiarism) {
      plagiarism = await this.runPlagiarismCheck(projectId, userId);
    }

    // Run AI Evaluation out of 100 with exact 7 criteria breakdown
    const aiResult = await defaultAIProvider.evaluateProject(project, plagiarism);

    return projectCheckerRepository.upsertAIEvaluation({
      projectId,
      problemDefinitionScore: aiResult.criteria.problemDefinition.obtainedScore,
      problemDefinitionFeedback: aiResult.criteria.problemDefinition.feedback,
      innovationNoveltyScore: aiResult.criteria.innovationNovelty.obtainedScore,
      innovationNoveltyFeedback: aiResult.criteria.innovationNovelty.feedback,
      technicalImplementationScore: aiResult.criteria.technicalImplementation.obtainedScore,
      technicalImplementationFeedback: aiResult.criteria.technicalImplementation.feedback,
      functionalityScore: aiResult.criteria.functionality.obtainedScore,
      functionalityFeedback: aiResult.criteria.functionality.feedback,
      codeQualityScore: aiResult.criteria.codeQuality.obtainedScore,
      codeQualityFeedback: aiResult.criteria.codeQuality.feedback,
      documentationScore: aiResult.criteria.documentation.obtainedScore,
      documentationFeedback: aiResult.criteria.documentation.feedback,
      overallQualityScore: aiResult.criteria.overallQuality.obtainedScore,
      overallQualityFeedback: aiResult.criteria.overallQuality.feedback,
      totalScore: aiResult.overallScore,
      strengths: aiResult.strengths,
      weaknesses: aiResult.weaknesses,
      technicalAnalysis: aiResult.technicalAnalysis,
      codeAnalysis: aiResult.codeAnalysis,
      documentationAnalysis: aiResult.documentationAnalysis,
      actionableSuggestions: aiResult.actionableSuggestions,
      improvementPlan: aiResult.improvementPlan,
      summary: aiResult.summary,
      aiModel: aiResult.aiModel,
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
}

export const projectCheckerService = new ProjectCheckerService();

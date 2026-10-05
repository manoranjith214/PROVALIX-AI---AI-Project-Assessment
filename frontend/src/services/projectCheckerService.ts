import { apiClient } from './api/apiClient';
import { ProjectDetails, StandaloneAIEvaluation } from '../types';

export interface CreateProjectCheckerInput {
  title: string;
  category?: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  objectives?: string;
  innovation?: string;
  features?: string;
  targetUsers?: string;
  technologies?: string[];
  programmingLanguages?: string[];
  testingApproach?: string;
  limitations?: string;
  futureEnhancements?: string;
  githubUrl?: string;
  liveDemoUrl?: string;
  externalLinks?: string[];
}

export interface ProjectCheckerProject {
  id: string;
  userId: string;
  title: string;
  category?: string;
  domain?: string;
  description?: string;
  status: string;
  similarityScore?: number | null;
  overallScore?: number | null;
  createdAt: string;
  updatedAt: string;
  resources?: any[];
  aiEvaluation?: any;
  plagiarism?: any;
}

export interface ListProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export interface PaginatedProjectsResult {
  projects: ProjectCheckerProject[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const projectCheckerService = {
  /**
   * Create a new standalone project for evaluation
   */
  async createProject(data: CreateProjectCheckerInput): Promise<any> {
    return apiClient.post('/project-checker/projects', data);
  },

  /**
   * List the authenticated user's standalone project evaluations with pagination metadata
   */
  async listProjectsWithMeta(params?: ListProjectsParams): Promise<PaginatedProjectsResult> {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);

    const qs = query.toString();
    const endpoint = `/project-checker/projects${qs ? `?${qs}` : ''}`;
    const res = await apiClient.getWithMeta<ProjectCheckerProject[]>(endpoint);
    return {
      projects: Array.isArray(res.data) ? res.data : [],
      pagination: res.pagination,
    };
  },

  /**
   * List the authenticated user's standalone project evaluations
   */
  async listProjects(params?: ListProjectsParams): Promise<ProjectCheckerProject[]> {
    const res = await this.listProjectsWithMeta(params);
    return res.projects;
  },

  /**
   * Get single project details by ID
   */
  async getProjectById(id: string): Promise<any> {
    return apiClient.get(`/project-checker/projects/${id}`);
  },

  /**
   * Update existing project details
   */
  async updateProject(id: string, data: Partial<CreateProjectCheckerInput>): Promise<any> {
    return apiClient.put(`/project-checker/projects/${id}`, data);
  },

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<any> {
    return apiClient.delete(`/project-checker/projects/${id}`);
  },

  /**
   * Upload resource file using multipart/form-data via Multer
   */
  async uploadResource(id: string, file: File, type = 'other'): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return apiClient.post(`/project-checker/projects/${id}/resources`, formData);
  },

  /**
   * Trigger plagiarism check for the project
   */
  async runPlagiarismCheck(id: string): Promise<any> {
    return apiClient.post(`/project-checker/projects/${id}/plagiarism-check`);
  },

  /**
   * Trigger 7-criteria AI evaluation (/100)
   */
  async runAIEvaluation(id: string): Promise<any> {
    return apiClient.post(`/project-checker/projects/${id}/ai-evaluate`);
  },

  /**
   * Retrieve structured project evaluation report
   */
  async getReport(id: string): Promise<any> {
    return apiClient.get(`/project-checker/projects/${id}/report`);
  },

  /**
   * Retrieve PDF/Markdown report document
   */
  async getPdfReport(id: string): Promise<{ markdown: string; report: any }> {
    return apiClient.get(`/project-checker/projects/${id}/report/pdf?format=json`);
  },

  /**
   * Download the actual compiled PDF blob from backend
   */
  async downloadPdfReport(id: string): Promise<Blob> {
    return apiClient.downloadBlob(`/project-checker/projects/${id}/report/pdf`);
  },

  /**
   * Helper to transform backend report payload into frontend ProjectDetails and StandaloneAIEvaluation
   */
  mapBackendReport(reportData: any): { project: ProjectDetails; evaluation: StandaloneAIEvaluation } {
    const p = reportData.project || reportData;
    const ai = reportData.evaluation || reportData.aiEvaluation || reportData;
    const plag = reportData.plagiarism || ai?.plagiarism || {
      codeSimilarity: 0,
      reportSimilarity: 0,
      overallSimilarity: 0,
      status: 'Low',
    };

    let techs: string[] = [];
    if (Array.isArray(p.technologies)) {
      techs = p.technologies;
    } else if (typeof p.technologies === 'string') {
      try { techs = JSON.parse(p.technologies); } catch { techs = [p.technologies]; }
    }

    let langs: string[] = [];
    if (Array.isArray(p.programmingLanguages)) {
      langs = p.programmingLanguages;
    } else if (typeof p.programmingLanguages === 'string') {
      try { langs = JSON.parse(p.programmingLanguages); } catch { langs = [p.programmingLanguages]; }
    }

    const project: ProjectDetails = {
      id: p.id,
      title: p.title,
      category: p.category || 'General Computing & AI',
      description: p.description || '',
      problemStatement: p.problemStatement || '',
      proposedSolution: p.proposedSolution || '',
      objectives: p.objectives || '',
      innovation: p.innovation || '',
      features: p.features || '',
      targetUsers: p.targetUsers || '',
      technologies: techs,
      programmingLanguages: langs,
      testingApproach: p.testingApproach || '',
      limitations: p.limitations || '',
      futureEnhancements: p.futureEnhancements || '',
      githubUrl: p.githubUrl,
      liveDemoUrl: p.liveDemoUrl,
      resources: p.resources || [],
      status: p.status || 'EVALUATED',
      createdAt: p.createdAt || new Date().toISOString(),
      updatedAt: p.updatedAt || p.createdAt || new Date().toISOString(),
    };

    const rawScore = ai?.overallScore ?? ai?.totalScoreOutof100 ?? ai?.totalScore ?? reportData?.overallScore ?? reportData?.score ?? p.overallScore ?? p.score;
    const overallScore = rawScore !== null && rawScore !== undefined ? Number(rawScore) : 0;

    const evaluation: StandaloneAIEvaluation = {
      id: `eval_${p.id}`,
      projectId: p.id,
      overallScore,
      criteria: {
        problemDefinition: {
          name: 'Problem Definition',
          maxScore: 15,
          obtainedScore: ai?.criteria?.problemDefinition?.obtainedScore ?? ai?.criteria?.problemDefinition?.score ?? (ai?.problemDefinitionScore !== undefined ? Number(ai.problemDefinitionScore) : (overallScore > 0 ? Math.round(overallScore * 0.15) : 0)),
          feedback: ai?.criteria?.problemDefinition?.feedback ?? ai?.problemDefinitionFeedback ?? '',
        },
        innovationNovelty: {
          name: 'Innovation & Novelty',
          maxScore: 20,
          obtainedScore: ai?.criteria?.innovationNovelty?.obtainedScore ?? ai?.criteria?.innovationNovelty?.score ?? (ai?.innovationNoveltyScore !== undefined ? Number(ai.innovationNoveltyScore) : (overallScore > 0 ? Math.round(overallScore * 0.20) : 0)),
          feedback: ai?.criteria?.innovationNovelty?.feedback ?? ai?.innovationNoveltyFeedback ?? '',
        },
        technicalImplementation: {
          name: 'Technical Implementation',
          maxScore: 20,
          obtainedScore: ai?.criteria?.technicalImplementation?.obtainedScore ?? ai?.criteria?.technicalImplementation?.score ?? (ai?.technicalImplementationScore !== undefined ? Number(ai.technicalImplementationScore) : (overallScore > 0 ? Math.round(overallScore * 0.20) : 0)),
          feedback: ai?.criteria?.technicalImplementation?.feedback ?? ai?.technicalImplementationFeedback ?? '',
        },
        functionality: {
          name: 'Functionality',
          maxScore: 15,
          obtainedScore: ai?.criteria?.functionality?.obtainedScore ?? ai?.criteria?.functionality?.score ?? (ai?.functionalityScore !== undefined ? Number(ai.functionalityScore) : (overallScore > 0 ? Math.round(overallScore * 0.15) : 0)),
          feedback: ai?.criteria?.functionality?.feedback ?? ai?.functionalityFeedback ?? '',
        },
        codeQuality: {
          name: 'Code Quality',
          maxScore: 10,
          obtainedScore: ai?.criteria?.codeQuality?.obtainedScore ?? ai?.criteria?.codeQuality?.score ?? (ai?.codeQualityScore !== undefined ? Number(ai.codeQualityScore) : (overallScore > 0 ? Math.round(overallScore * 0.10) : 0)),
          feedback: ai?.criteria?.codeQuality?.feedback ?? ai?.codeQualityFeedback ?? '',
        },
        documentation: {
          name: 'Documentation',
          maxScore: 10,
          obtainedScore: ai?.criteria?.documentation?.obtainedScore ?? ai?.criteria?.documentation?.score ?? (ai?.documentationScore !== undefined ? Number(ai.documentationScore) : (overallScore > 0 ? Math.round(overallScore * 0.10) : 0)),
          feedback: ai?.criteria?.documentation?.feedback ?? ai?.documentationFeedback ?? '',
        },
        overallQuality: {
          name: 'Overall Project Quality',
          maxScore: 10,
          obtainedScore: ai?.criteria?.overallQuality?.obtainedScore ?? ai?.criteria?.overallQuality?.score ?? (ai?.overallQualityScore !== undefined ? Number(ai.overallQualityScore) : (overallScore > 0 ? Math.round(overallScore * 0.10) : 0)),
          feedback: ai?.criteria?.overallQuality?.feedback ?? ai?.overallQualityFeedback ?? '',
        },
      },
      plagiarism: {
        codeSimilarity: plag.codeSimilarity ?? 0,
        reportSimilarity: plag.reportSimilarity ?? 0,
        overallSimilarity: plag.overallSimilarity ?? 0,
        status: plag.status ?? 'Low',
        isDemoData: false,
      },
      strengths: Array.isArray(ai?.strengths) ? ai.strengths : [],
      weaknesses: Array.isArray(ai?.weaknesses) ? ai.weaknesses : [],
      technicalAnalysis: ai?.technicalAnalysis || '',
      codeAnalysis: ai?.codeAnalysis || '',
      documentationAnalysis: ai?.documentationAnalysis || '',
      actionableSuggestions: Array.isArray(ai?.actionableSuggestions) ? ai.actionableSuggestions : [],
      improvementPlan: Array.isArray(ai?.improvementPlan) ? ai.improvementPlan : [],
      summary: ai?.summary || '',
      evaluatedAt: ai?.evaluatedAt || new Date().toISOString(),
      status: p.status || 'EVALUATED',
      isDemoData: false,
    };

    return { project, evaluation };
  },
};

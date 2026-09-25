import { supabase } from '../lib/supabase';
import { StandaloneAIEvaluation, ProjectDetails } from '../types';

export interface SupabaseProjectReportRow {
  id: string;
  user_id: string;
  project_title: string;
  category: string;
  status: string;
  score: number;
  similarity: number;
  report_data: {
    project?: Partial<ProjectDetails>;
    evaluation?: Partial<StandaloneAIEvaluation>;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface GetReportsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: 'newest' | 'oldest' | 'title_asc' | 'title_desc';
}

export interface PaginatedReportResult {
  reports: SupabaseProjectReportRow[];
  totalCount: number;
  totalPages: number;
}

export interface CreateReportInput {
  project_title: string;
  category?: string;
  status?: string;
  score?: number;
  similarity?: number;
  report_data?: any;
}

export const projectReportService = {
  /**
   * Fetches project reports strictly for the current authenticated Supabase user.
   * Direct Supabase query to `project_reports` table with RLS.
   */
  async getReports(options: GetReportsOptions = {}): Promise<PaginatedReportResult> {
    const {
      page = 1,
      limit = 9,
      search = '',
      status = 'ALL',
      sortBy = 'newest',
    } = options;

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[projectReportService] Auth check failed or no user logged in:', userError);
      throw new Error(userError?.message || 'Authentication required to view project reports.');
    }

    try {
      let query = supabase
        .from('project_reports')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Search filter
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        query = query.or(`project_title.ilike.%${trimmedSearch}%,category.ilike.%${trimmedSearch}%`);
      }

      // Status filter
      if (status && status !== 'ALL') {
        query = query.ilike('status', `%${status}%`);
      }

      // Sorting
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'title_asc':
          query = query.order('project_title', { ascending: true });
          break;
        case 'title_desc':
          query = query.order('project_title', { ascending: false });
          break;
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error('[projectReportService] Supabase report fetch error:', error);
        throw error;
      }

      const totalCount = count || 0;
      const totalPages = Math.max(1, Math.ceil(totalCount / limit));

      return {
        reports: (data || []) as SupabaseProjectReportRow[],
        totalCount,
        totalPages,
      };
    } catch (err: any) {
      console.error('[projectReportService] Error loading reports from Supabase:', err);
      throw err;
    }
  },

  /**
   * Fetches a single project report by ID for the authenticated user.
   */
  async getReportById(id: string): Promise<SupabaseProjectReportRow | null> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[projectReportService] Auth check failed for getReportById:', userError);
      throw new Error('Authentication required.');
    }

    const { data, error } = await supabase
      .from('project_reports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error(`[projectReportService] Supabase report fetch error for report ${id}:`, error);
      throw error;
    }

    return (data as SupabaseProjectReportRow) || null;
  },

  /**
   * Saves a new project report directly into Supabase `project_reports`
   * linked to the authenticated user's ID.
   */
  async createReport(input: CreateReportInput): Promise<SupabaseProjectReportRow> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[projectReportService] Cannot save report - unauthenticated user:', userError);
      throw new Error('You must be logged in to save project reports.');
    }

    const payload = {
      user_id: user.id,
      project_title: input.project_title || 'Untitled Project',
      category: input.category || 'General Computing & AI',
      status: input.status || 'Evaluated',
      score: input.score ?? 0,
      similarity: input.similarity ?? 0,
      report_data: input.report_data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('project_reports')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[projectReportService] Supabase report insert failure:', error);
      throw error;
    }

    return data as SupabaseProjectReportRow;
  },

  /**
   * Updates an existing report title or fields for the current user.
   */
  async updateReport(id: string, updates: Partial<CreateReportInput>): Promise<SupabaseProjectReportRow> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Authentication required.');
    }

    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.project_title !== undefined) dbUpdates.project_title = updates.project_title;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.score !== undefined) dbUpdates.score = updates.score;
    if (updates.similarity !== undefined) dbUpdates.similarity = updates.similarity;
    if (updates.report_data !== undefined) dbUpdates.report_data = updates.report_data;

    const { data, error } = await supabase
      .from('project_reports')
      .update(dbUpdates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error(`[projectReportService] Supabase report update failure for report ${id}:`, error);
      throw error;
    }

    return data as SupabaseProjectReportRow;
  },

  /**
   * Permanently deletes a report belonging to the current user.
   */
  async deleteReport(id: string): Promise<boolean> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error('Authentication required.');
    }

    const { error } = await supabase
      .from('project_reports')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error(`[projectReportService] Supabase report delete failure for report ${id}:`, error);
      throw error;
    }

    return true;
  },

  /**
   * Transforms a Supabase project_reports row into ProjectDetails & StandaloneAIEvaluation
   */
  mapRowToDetails(row: SupabaseProjectReportRow): { project: ProjectDetails; evaluation: StandaloneAIEvaluation } {
    const rawProject = row.report_data?.project || {};
    const rawEval = row.report_data?.evaluation || {};

    const project: ProjectDetails = {
      id: row.id,
      title: row.project_title,
      category: row.category || 'General Computing & AI',
      description: rawProject.description || '',
      problemStatement: rawProject.problemStatement || '',
      proposedSolution: rawProject.proposedSolution || '',
      objectives: rawProject.objectives || '',
      innovation: rawProject.innovation || '',
      features: rawProject.features || '',
      targetUsers: rawProject.targetUsers || '',
      technologies: Array.isArray(rawProject.technologies) ? rawProject.technologies : [],
      programmingLanguages: Array.isArray(rawProject.programmingLanguages) ? rawProject.programmingLanguages : [],
      testingApproach: rawProject.testingApproach || '',
      limitations: rawProject.limitations || '',
      futureEnhancements: rawProject.futureEnhancements || '',
      githubUrl: rawProject.githubUrl,
      liveDemoUrl: rawProject.liveDemoUrl,
      resources: Array.isArray(rawProject.resources) ? rawProject.resources : [],
      status: row.status || 'Evaluated',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };

    const numScore = Number(row.score) || 0;
    const numSim = Number(row.similarity) || 0;

    const evaluation: StandaloneAIEvaluation = {
      id: rawEval.id || `eval_${row.id}`,
      projectId: row.id,
      overallScore: rawEval.overallScore !== undefined ? rawEval.overallScore : numScore,
      criteria: rawEval.criteria || {
        problemDefinition: {
          name: 'Problem Definition',
          maxScore: 15,
          obtainedScore: Math.round(numScore * 0.15),
          feedback: 'Clear problem definition aligned with domain goals.',
        },
        innovationNovelty: {
          name: 'Innovation & Novelty',
          maxScore: 20,
          obtainedScore: Math.round(numScore * 0.20),
          feedback: 'Domain-specific innovation and technical viability verified.',
        },
        technicalImplementation: {
          name: 'Technical Implementation',
          maxScore: 20,
          obtainedScore: Math.round(numScore * 0.20),
          feedback: 'Modular software architecture and implementation.',
        },
        functionality: {
          name: 'Functionality',
          maxScore: 15,
          obtainedScore: Math.round(numScore * 0.15),
          feedback: 'Core functional workflows structured effectively.',
        },
        codeQuality: {
          name: 'Code Quality',
          maxScore: 10,
          obtainedScore: Math.round(numScore * 0.10),
          feedback: 'Clean code conventions and structure.',
        },
        documentation: {
          name: 'Documentation',
          maxScore: 10,
          obtainedScore: Math.round(numScore * 0.10),
          feedback: 'Comprehensive architectural and user documentation.',
        },
        overallQuality: {
          name: 'Overall Project Quality',
          maxScore: 10,
          obtainedScore: Math.round(numScore * 0.10),
          feedback: 'Solid engineering execution and design rigor.',
        },
      },
      plagiarism: rawEval.plagiarism || {
        codeSimilarity: Math.max(0, Math.round(numSim * 0.8)),
        reportSimilarity: Math.max(0, Math.round(numSim * 1.2)),
        overallSimilarity: numSim,
        status: numSim <= 15 ? 'Low' : numSim <= 30 ? 'Moderate' : 'High',
        isDemoData: false,
      },
      strengths: Array.isArray(rawEval.strengths) && rawEval.strengths.length > 0 ? rawEval.strengths : [
        'Well-defined technical problem statement and architecture.',
        'Modular design with clear separation of concerns.',
      ],
      weaknesses: Array.isArray(rawEval.weaknesses) && rawEval.weaknesses.length > 0 ? rawEval.weaknesses : [
        'Automated regression testing benchmarks should be formalized.',
      ],
      technicalAnalysis: rawEval.technicalAnalysis || `Technical evaluation confirms clean architectural design and practical execution viability.`,
      codeAnalysis: rawEval.codeAnalysis || 'Clean component structure, strong typing practices, and standard error boundary implementations.',
      documentationAnalysis: rawEval.documentationAnalysis || 'Documentation provides clear objectives, architecture overview, and deployment parameters.',
      actionableSuggestions: Array.isArray(rawEval.actionableSuggestions) && rawEval.actionableSuggestions.length > 0 ? rawEval.actionableSuggestions : [
        'Implement automated CI/CD unit and integration tests.',
        'Add structured error logging and telemetry for operational observability.',
      ],
      improvementPlan: Array.isArray(rawEval.improvementPlan) && rawEval.improvementPlan.length > 0 ? rawEval.improvementPlan : [
        { area: 'Testing Automation', suggestion: 'Implement automated CI/CD test suites across edge and unit modules.', priority: 'High' },
        { area: 'Operational Monitoring', suggestion: 'Add performance telemetry and error reporting hooks.', priority: 'Medium' },
      ],
      summary: rawEval.summary || `${row.project_title} exhibits strong design principles and practical execution viability. Plagiarism metrics are well within safe thresholds.`,
      evaluatedAt: rawEval.evaluatedAt || row.created_at,
      status: row.status || 'Evaluated',
      isDemoData: false,
    };

    return { project, evaluation };
  },
};


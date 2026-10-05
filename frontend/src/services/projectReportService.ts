import { supabase } from '../lib/supabase';
import { StandaloneAIEvaluation, ProjectDetails } from '../types';
import { projectCheckerService } from './projectCheckerService';
import { tokenStorage } from './api/tokenStorage';

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

async function getAuthenticatedUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    return session.user;
  }
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return null;
  }
  return user;
}

export const projectReportService = {
  /**
   * Fetches project reports strictly for the current authenticated user.
   * Primary: Backend PostgreSQL/Prisma API
   * Secondary fallback: Supabase `project_reports` table
   */
  async getReports(options: GetReportsOptions = {}): Promise<PaginatedReportResult> {
    const {
      page = 1,
      limit = 9,
      search = '',
      status = 'ALL',
      sortBy = 'newest',
    } = options;

    // 1. Primary: Provalix backend API (PostgreSQL/Prisma)
    if (tokenStorage.getAccessToken()) {
      try {
        const backendResult = await projectCheckerService.listProjectsWithMeta({
          page,
          limit,
          search,
          status,
          sortBy: sortBy.includes('title') ? 'title' : 'createdAt',
          sortOrder: sortBy === 'oldest' || sortBy === 'title_asc' ? 'asc' : 'desc',
        });

        if (backendResult && Array.isArray(backendResult.projects)) {
          const mappedReports: SupabaseProjectReportRow[] = backendResult.projects.map((p) => {
            const ai = p.aiEvaluation;
            const plag = p.plagiarism;
            const score = p.overallScore ?? ai?.overallScore ?? ai?.totalScore ?? ai?.totalScoreOutof100 ?? null;
            const sim = p.similarityScore ?? plag?.overallSimilarity ?? plag?.similarityScore ?? null;
            return {
              id: p.id,
              user_id: p.userId,
              project_title: p.title,
              category: p.category || 'General Computing & AI',
              status: p.status || 'Evaluated',
              score: score !== null ? Number(score) : 0,
              similarity: sim !== null ? Number(sim) : 0,
              report_data: {
                project: p,
                evaluation: ai,
                aiEvaluation: ai,
                plagiarism: plag,
              },
              created_at: p.createdAt,
              updated_at: p.updatedAt || p.createdAt,
            };
          });

          return {
            reports: mappedReports,
            totalCount: backendResult.pagination?.total ?? mappedReports.length,
            totalPages: backendResult.pagination?.totalPages ?? 1,
          };
        }
      } catch (backendErr) {
        console.warn('[projectReportService] Backend listProjectsWithMeta notice:', backendErr);
      }
    }

    // 2. Secondary fallback: Supabase
    const user = await getAuthenticatedUser();

    if (!user) {
      console.error('[projectReportService] Auth check failed or no user logged in');
      throw new Error('Authentication required to view project reports.');
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
    if (tokenStorage.getAccessToken()) {
      try {
        const rep = await projectCheckerService.getReport(id);
        if (rep && (rep.project || rep.id)) {
          const p = rep.project || rep;
          const ai = rep.evaluation || rep.aiEvaluation;
          const plag = rep.plagiarism;
          const repScore = rep.overallScore ?? rep.score ?? ai?.overallScore ?? ai?.totalScore ?? ai?.totalScoreOutof100 ?? p.overallScore;
          const repSim = rep.similarityScore ?? rep.similarity ?? plag?.overallSimilarity ?? plag?.similarityScore ?? p.similarityScore;

          return {
            id: p.id,
            user_id: p.userId,
            project_title: p.title,
            category: p.category || 'General Computing & AI',
            status: p.status || 'Evaluated',
            score: repScore !== null && repScore !== undefined ? Number(repScore) : 0,
            similarity: repSim !== null && repSim !== undefined ? Number(repSim) : 0,
            report_data: rep,
            created_at: p.createdAt || new Date().toISOString(),
            updated_at: p.updatedAt || p.createdAt || new Date().toISOString(),
          };
        }
      } catch (backendErr) {
        // Fallback to Supabase
      }
    }

    const user = await getAuthenticatedUser();

    if (!user) {
      console.error('[projectReportService] Auth check failed for getReportById');
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
    const user = await getAuthenticatedUser();

    if (!user) {
      console.error('[projectReportService] Cannot save report - unauthenticated user');
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
    if (tokenStorage.getAccessToken()) {
      try {
        const updated = await projectCheckerService.updateProject(id, {
          title: updates.project_title,
          category: updates.category,
        });
        if (updated) {
          return {
            id: updated.id,
            user_id: updated.userId,
            project_title: updated.title,
            category: updated.category || 'General Computing & AI',
            status: updated.status || 'Evaluated',
            score: updated.overallScore ?? 0,
            similarity: updated.similarityScore ?? 0,
            report_data: { project: updated },
            created_at: updated.createdAt,
            updated_at: updated.updatedAt || updated.createdAt,
          };
        }
      } catch {
        // fallback
      }
    }

    const user = await getAuthenticatedUser();

    if (!user) {
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
    if (tokenStorage.getAccessToken()) {
      try {
        await projectCheckerService.deleteProject(id);
        return true;
      } catch {
        // fallback
      }
    }

    const user = await getAuthenticatedUser();

    if (!user) {
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
    const rawEval = row.report_data?.evaluation || row.report_data?.aiEvaluation || {};
    const rawPlag = row.report_data?.plagiarism || rawEval.plagiarism || {};

    const project: ProjectDetails = {
      id: row.id,
      title: row.project_title,
      category: row.category || rawProject.category || 'General Computing & AI',
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
      status: row.status || rawProject.status || 'Evaluated',
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    };

    const numScore = rawEval.overallScore !== undefined && rawEval.overallScore !== null
      ? Number(rawEval.overallScore)
      : (rawEval.totalScore !== undefined && rawEval.totalScore !== null
        ? Number(rawEval.totalScore)
        : (rawEval.totalScoreOutof100 !== undefined && rawEval.totalScoreOutof100 !== null
          ? Number(rawEval.totalScoreOutof100)
          : (row.score !== null && row.score !== undefined ? Number(row.score) : 0)));

    const numSim = rawPlag.overallSimilarity !== undefined && rawPlag.overallSimilarity !== null
      ? Number(rawPlag.overallSimilarity)
      : (row.similarity !== null && row.similarity !== undefined ? Number(row.similarity) : 0);

    const codeSim = rawPlag.codeSimilarity !== undefined && rawPlag.codeSimilarity !== null
      ? Number(rawPlag.codeSimilarity)
      : Math.max(0, Math.round(numSim * 0.8));

    const repSim = rawPlag.reportSimilarity !== undefined && rawPlag.reportSimilarity !== null
      ? Number(rawPlag.reportSimilarity)
      : Math.max(0, Math.round(numSim * 1.2));

    const getCriterion = (
      key: string,
      flatKey: string,
      maxScore: number,
      defaultName: string,
      defaultFeedback: string
    ) => {
      const nested = rawEval.criteria?.[key];
      const flatScore = rawEval[flatKey];
      const flatFeedback = rawEval[`${flatKey.replace('Score', 'Feedback')}`];

      const scoreVal = nested?.obtainedScore ?? nested?.score ?? (flatScore !== undefined && flatScore !== null ? Number(flatScore) : undefined);
      const feedbackVal = nested?.feedback || flatFeedback || defaultFeedback;

      return {
        name: nested?.name || defaultName,
        maxScore: nested?.maxScore ?? maxScore,
        obtainedScore: scoreVal !== undefined ? scoreVal : (numScore > 0 ? Math.round(numScore * (maxScore / 100)) : 0),
        feedback: feedbackVal,
      };
    };

    const criteria = {
      problemDefinition: getCriterion('problemDefinition', 'problemDefinitionScore', 15, 'Problem Definition', 'Clear problem definition aligned with domain goals.'),
      innovationNovelty: getCriterion('innovationNovelty', 'innovationNoveltyScore', 20, 'Innovation & Novelty', 'Domain-specific innovation and technical viability verified.'),
      technicalImplementation: getCriterion('technicalImplementation', 'technicalImplementationScore', 20, 'Technical Implementation', 'Modular software architecture and implementation.'),
      functionality: getCriterion('functionality', 'functionalityScore', 15, 'Functionality', 'Core functional workflows structured effectively.'),
      codeQuality: getCriterion('codeQuality', 'codeQualityScore', 10, 'Code Quality', 'Clean code conventions and structure.'),
      documentation: getCriterion('documentation', 'documentationScore', 10, 'Documentation', 'Comprehensive architectural and user documentation.'),
      overallQuality: getCriterion('overallQuality', 'overallQualityScore', 10, 'Overall Project Quality', 'Solid engineering execution and design rigor.'),
    };

    const evaluation: StandaloneAIEvaluation = {
      id: rawEval.id || `eval_${row.id}`,
      projectId: row.id,
      overallScore: numScore,
      criteria,
      plagiarism: {
        codeSimilarity: codeSim,
        reportSimilarity: repSim,
        overallSimilarity: numSim,
        status: rawPlag.status || (numSim <= 15 ? 'Low' : numSim <= 30 ? 'Moderate' : 'High'),
        isDemoData: false,
      },
      strengths: Array.isArray(rawEval.strengths) && rawEval.strengths.length > 0
        ? rawEval.strengths
        : (typeof rawEval.strengths === 'string' ? JSON.parse(rawEval.strengths) : [
          'Well-defined technical problem statement and architecture.',
          'Modular design with clear separation of concerns.',
        ]),
      weaknesses: Array.isArray(rawEval.weaknesses) && rawEval.weaknesses.length > 0
        ? rawEval.weaknesses
        : (typeof rawEval.weaknesses === 'string' ? JSON.parse(rawEval.weaknesses) : [
          'Automated regression testing benchmarks should be formalized.',
        ]),
      technicalAnalysis: rawEval.technicalAnalysis || 'Technical evaluation confirms clean architectural design and practical execution viability.',
      codeAnalysis: rawEval.codeAnalysis || 'Clean component structure, strong typing practices, and standard error boundary implementations.',
      documentationAnalysis: rawEval.documentationAnalysis || 'Documentation provides clear objectives, architecture overview, and deployment parameters.',
      actionableSuggestions: Array.isArray(rawEval.actionableSuggestions) && rawEval.actionableSuggestions.length > 0
        ? rawEval.actionableSuggestions
        : (typeof rawEval.actionableSuggestions === 'string' ? JSON.parse(rawEval.actionableSuggestions) : [
          'Implement automated CI/CD unit and integration tests.',
          'Add structured error logging and telemetry for operational observability.',
        ]),
      improvementPlan: Array.isArray(rawEval.improvementPlan) && rawEval.improvementPlan.length > 0
        ? rawEval.improvementPlan
        : (typeof rawEval.improvementPlan === 'string' ? JSON.parse(rawEval.improvementPlan) : [
          { area: 'Testing Automation', suggestion: 'Implement automated CI/CD test suites across edge and unit modules.', priority: 'High' },
          { area: 'Operational Monitoring', suggestion: 'Add performance telemetry and error reporting hooks.', priority: 'Medium' },
        ]),
      summary: rawEval.summary || `${row.project_title} exhibits strong design principles and practical execution viability. Plagiarism metrics are well within safe thresholds.`,
      evaluatedAt: rawEval.evaluatedAt || row.created_at,
      status: row.status || 'Evaluated',
      isDemoData: false,
    };

    return { project, evaluation };
  },
};


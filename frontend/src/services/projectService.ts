import { ProjectDetails, StandaloneAIEvaluation } from '../types';
import { supabaseDataService } from './supabaseDataService';
import { projectCheckerService } from './projectCheckerService';

export const projectService = {
  async getAllProjects(): Promise<ProjectDetails[]> {
    try {
      // 1. Primary: Load from Supabase PostgreSQL (Row Level Security protected)
      const sbProjects = await supabaseDataService.getProjects();
      if (sbProjects && sbProjects.length > 0) {
        return sbProjects.map((p: any) => ({
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
          technologies: Array.isArray(p.technologies) ? p.technologies : [],
          programmingLanguages: Array.isArray(p.programmingLanguages) ? p.programmingLanguages : [],
          testingApproach: p.testingApproach || '',
          limitations: p.limitations || '',
          futureEnhancements: p.futureEnhancements || '',
          githubUrl: p.githubUrl,
          liveDemoUrl: p.liveDemoUrl,
          resources: p.resources || [],
          createdAt: p.createdAt || new Date().toISOString(),
        }));
      }

      // 2. Secondary fallback: Provalix backend
      const backendProjects = await projectCheckerService.listProjects();
      if (Array.isArray(backendProjects) && backendProjects.length > 0) {
        return backendProjects.map((p: any) => ({
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
          technologies: Array.isArray(p.technologies)
            ? p.technologies
            : typeof p.technologies === 'string'
            ? JSON.parse(p.technologies)
            : [],
          programmingLanguages: Array.isArray(p.programmingLanguages)
            ? p.programmingLanguages
            : typeof p.programmingLanguages === 'string'
            ? JSON.parse(p.programmingLanguages)
            : [],
          testingApproach: p.testingApproach || '',
          limitations: p.limitations || '',
          futureEnhancements: p.futureEnhancements || '',
          githubUrl: p.githubUrl,
          liveDemoUrl: p.liveDemoUrl,
          resources: p.resources || [],
          createdAt: p.createdAt || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('[projectService] getAllProjects notice:', err);
    }
    return [];
  },

  async getProjectById(id: string): Promise<ProjectDetails | undefined> {
    try {
      // 1. Primary: Check Supabase PostgreSQL
      const sbProject = await supabaseDataService.getProjectById(id);
      if (sbProject) {
        return sbProject;
      }

      // 2. Fallback: Provalix backend
      const p = await projectCheckerService.getProjectById(id);
      if (p) {
        return {
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
          technologies: Array.isArray(p.technologies)
            ? p.technologies
            : typeof p.technologies === 'string'
            ? JSON.parse(p.technologies)
            : [],
          programmingLanguages: Array.isArray(p.programmingLanguages)
            ? p.programmingLanguages
            : typeof p.programmingLanguages === 'string'
            ? JSON.parse(p.programmingLanguages)
            : [],
          testingApproach: p.testingApproach || '',
          limitations: p.limitations || '',
          futureEnhancements: p.futureEnhancements || '',
          githubUrl: p.githubUrl,
          liveDemoUrl: p.liveDemoUrl,
          resources: p.resources || [],
          createdAt: p.createdAt || new Date().toISOString(),
        };
      }
    } catch {
      // Not found
    }
    return undefined;
  },

  async createProject(projectData: Omit<ProjectDetails, 'id' | 'createdAt'>): Promise<ProjectDetails> {
    // 1. Persist directly to Supabase public.projects
    try {
      const createdSb = await supabaseDataService.createProject(projectData);
      // Also sync to backend if online
      projectCheckerService.createProject(projectData as any).catch(() => {});
      return {
        ...projectData,
        id: createdSb.id,
        createdAt: createdSb.createdAt || new Date().toISOString(),
      };
    } catch (err) {
      console.warn('[projectService] Supabase createProject notice, trying backend:', err);
    }

    // 2. Fallback to backend API
    const created = await projectCheckerService.createProject({
      title: projectData.title,
      category: projectData.category,
      description: projectData.description,
      problemStatement: projectData.problemStatement,
      proposedSolution: projectData.proposedSolution,
      objectives: projectData.objectives,
      innovation: projectData.innovation,
      features: projectData.features,
      targetUsers: projectData.targetUsers,
      technologies: projectData.technologies,
      programmingLanguages: projectData.programmingLanguages,
      testingApproach: projectData.testingApproach,
      limitations: projectData.limitations,
      futureEnhancements: projectData.futureEnhancements,
      githubUrl: projectData.githubUrl,
      liveDemoUrl: projectData.liveDemoUrl,
    });

    return {
      ...projectData,
      id: created.id,
      createdAt: created.createdAt || new Date().toISOString(),
    };
  },

  async getStandaloneEvaluations(): Promise<StandaloneAIEvaluation[]> {
    try {
      // 1. Primary: Supabase PostgreSQL
      const sbEvals = await supabaseDataService.getStandaloneEvaluations();
      if (sbEvals && sbEvals.length > 0) {
        return sbEvals;
      }

      // 2. Fallback: Provalix backend
      const backendProjects = await projectCheckerService.listProjects();
      if (Array.isArray(backendProjects)) {
        const withEvals = backendProjects.filter((p: any) => p.aiEvaluation);
        return withEvals.map((p: any) => {
          const mapped = projectCheckerService.mapBackendReport({
            project: p,
            aiEvaluation: p.aiEvaluation,
            plagiarism: p.plagiarism,
          });
          return mapped.evaluation;
        });
      }
    } catch (err) {
      console.warn('[projectService] getStandaloneEvaluations error:', err);
    }
    return [];
  },

  async getStandaloneEvaluationById(id: string): Promise<StandaloneAIEvaluation | undefined> {
    try {
      // 1. Primary: Supabase PostgreSQL
      const project = await supabaseDataService.getProjectById(id);
      if (project && (project as any).aiEvaluation) {
        return (project as any).aiEvaluation;
      }

      // 2. Fallback: Backend
      const report = await projectCheckerService.getReport(id);
      if (report) {
        const { evaluation } = projectCheckerService.mapBackendReport(report);
        return evaluation;
      }
    } catch {
      // Not found
    }
    return undefined;
  },

  async createStandaloneEvaluation(evaluation: StandaloneAIEvaluation): Promise<StandaloneAIEvaluation> {
    if (evaluation.projectId) {
      await supabaseDataService.saveEvaluation(evaluation.projectId, evaluation);
    }
    return evaluation;
  },

  async deleteProject(id: string): Promise<boolean> {
    try {
      await supabaseDataService.deleteProject(id);
    } catch (err) {
      console.warn('[projectService] Supabase deleteProject error:', err);
    }
    await projectCheckerService.deleteProject(id).catch(() => {});
    return true;
  },
};

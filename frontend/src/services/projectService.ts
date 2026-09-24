import { ProjectDetails, StandaloneAIEvaluation } from '../types';
import { projectCheckerService } from './projectCheckerService';

export const projectService = {
  async getAllProjects(): Promise<ProjectDetails[]> {
    try {
      const backendProjects = await projectCheckerService.listProjects();
      if (Array.isArray(backendProjects)) {
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
      console.warn('[projectService] getAllProjects error:', err);
    }
    return [];
  },

  async getProjectById(id: string): Promise<ProjectDetails | undefined> {
    try {
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
      // Not found or error
    }
    return undefined;
  },

  async createProject(projectData: Omit<ProjectDetails, 'id' | 'createdAt'>): Promise<ProjectDetails> {
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
    return evaluation;
  },
};

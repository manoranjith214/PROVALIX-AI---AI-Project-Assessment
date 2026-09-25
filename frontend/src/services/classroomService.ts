import { 
  Classroom, 
  ClassroomResourceRequirement, 
  ClassroomSubmission 
} from '../types';
import { Storage } from './storage';
import { apiClient } from './api/apiClient';
import { tokenStorage } from './api/tokenStorage';
import { supabaseDataService } from './supabaseDataService';

export function mapBackendClassroom(b: any): Classroom {
  let parsedResources: ClassroomResourceRequirement[] = [];
  if (typeof b.resourcesConfig === 'string') {
    try {
      parsedResources = JSON.parse(b.resourcesConfig);
    } catch {
      parsedResources = [];
    }
  } else if (Array.isArray(b.resources)) {
    parsedResources = b.resources;
  }

  const currentUser = tokenStorage.getCachedUser() || Storage.getCurrentUser();
  let userRole: 'OWNER' | 'EVALUATOR' | 'MEMBER' | undefined = undefined;
  if (currentUser && b.ownerId === currentUser.id) {
    userRole = 'OWNER';
  } else if (Array.isArray(b.members) && b.members.length > 0) {
    userRole = (b.members[0].role || 'MEMBER').toUpperCase() as any;
  }

  const startDateStr = b.startDate ? new Date(b.startDate).toISOString().slice(0, 10) : '2026-03-20';
  const deadlineStr = b.deadline ? new Date(b.deadline).toISOString().slice(0, 10) : '2026-05-15';

  return {
    id: b.id,
    name: b.name,
    description: b.description || '',
    logo: b.logo || undefined,
    code: b.code,
    ownerId: b.ownerId,
    ownerName: b.owner?.name || 'Classroom Owner',
    ownerEmail: b.owner?.email,
    startDate: startDateStr,
    submissionDeadline: deadlineStr,
    submissionMode: (b.submissionMode?.toLowerCase() === 'team') ? 'Team' : 'Individual',
    minTeamSize: b.minTeamSize ?? 2,
    maxTeamSize: b.maxTeamSize ?? 4,
    resources: parsedResources.length > 0 ? parsedResources : [
      { type: 'sourceCode', label: 'Source Code Repository / Archive', required: true },
      { type: 'projectReport', label: 'Comprehensive Technical Report (PDF)', required: true },
      { type: 'ppt', label: 'Presentation Deck Slides', required: true },
      { type: 'github', label: 'GitHub Repository URL', required: true },
    ],
    status: b.status || 'Active',
    participantCount: b._count?.members ?? (b.members?.length || 1),
    submissionCount: b._count?.submissions ?? (b.submissions?.length || 0),
    currentUserRole: userRole,
    members: b.members || [],
    evaluators: b.evaluators || [],
    invitations: b.invitations || [],
    createdAt: b.createdAt || new Date().toISOString(),
    isBackend: true,
  };
}

export function mapBackendSubmission(s: any): ClassroomSubmission {
  let parsedTech: string[] = [];
  if (typeof s.technologies === 'string') {
    try { parsedTech = JSON.parse(s.technologies); } catch { parsedTech = []; }
  } else if (Array.isArray(s.technologies)) {
    parsedTech = s.technologies;
  }

  let parsedLang: string[] = [];
  if (typeof s.programmingLanguages === 'string') {
    try { parsedLang = JSON.parse(s.programmingLanguages); } catch { parsedLang = []; }
  } else if (Array.isArray(s.programmingLanguages)) {
    parsedLang = s.programmingLanguages;
  }

  const resourcesList = Array.isArray(s.resources)
    ? s.resources.map((r: any) => ({
        type: r.type,
        name: r.name,
        size: r.size || '1.5 MB',
        uploadedAt: r.uploadedAt || new Date().toISOString(),
        status: r.status || 'uploaded',
        url: r.url || undefined,
      }))
    : [];

  return {
    id: s.id,
    classroomId: s.classroomId,
    submitterId: s.submitterId,
    submitterName: s.submitter?.name || 'Student Submitter',
    teamId: s.teamId || s.team?.id,
    teamName: s.team?.name,
    project: {
      id: s.id,
      title: s.title,
      category: s.category || 'General',
      description: s.description || '',
      problemStatement: s.problemStatement || '',
      proposedSolution: s.proposedSolution || '',
      objectives: s.objectives || '',
      innovation: s.innovation || '',
      features: s.features || '',
      targetUsers: s.targetUsers || '',
      technologies: parsedTech,
      programmingLanguages: parsedLang,
      testingApproach: s.testingApproach || '',
      limitations: s.limitations || '',
      futureEnhancements: s.futureEnhancements || '',
      githubUrl: s.githubUrl || '',
      liveDemoUrl: s.liveDemoUrl || '',
      resources: resourcesList,
      createdAt: s.submittedAt || new Date().toISOString(),
    },
    aiComponent: s.aiEvaluation ? {
      rawScore: s.aiEvaluation.rawScore || 45,
      codeSimilarity: s.aiEvaluation.codeSimilarity || 5,
      reportSimilarity: s.aiEvaluation.reportSimilarity || 8,
      deduction: s.aiEvaluation.deduction || 0,
      finalScore: s.aiEvaluation.finalScore || 45,
      isDemoData: false,
    } : undefined,
    facultyEvaluation: s.facultyEvaluation ? {
      evaluatorId: s.facultyEvaluation.evaluatorId,
      evaluatorName: s.facultyEvaluation.evaluator?.name || 'Faculty Evaluator',
      pptDemoScore: s.facultyEvaluation.pptDemoScore || 0,
      vivaQuestions: Array.isArray(s.facultyEvaluation.vivaResponses)
        ? s.facultyEvaluation.vivaResponses.map((vr: any) => ({
            questionNumber: vr.questionNumber,
            questionText: vr.questionText || `Question ${vr.questionNumber}`,
            maxScore: vr.maxMarks || 5,
            score: vr.score || 0,
            feedback: vr.feedback || '',
          }))
        : [],
      vivaTotalScore: s.facultyEvaluation.vivaTotalScore || 0,
      totalFacultyScore: s.facultyEvaluation.totalFacultyScore || 0,
      status: s.facultyEvaluation.status || 'Completed',
      reason: s.facultyEvaluation.reason || undefined,
      feedback: s.facultyEvaluation.feedback || '',
      evaluatedAt: s.facultyEvaluation.evaluatedAt || new Date().toISOString(),
    } : undefined,
    assignedEvaluatorId: s.assignedEvaluatorId,
    assignedEvaluatorName: s.assignedEvaluator?.name,
    verification: s.verification ? {
      status: s.verification.status,
      returnReason: s.verification.returnReason || undefined,
      verifiedAt: s.verification.verifiedAt,
      verifiedBy: s.verification.verifiedBy?.name,
    } : undefined,
    finalTotalScore: s.finalTotalScore ?? undefined,
    status: s.status || 'Submitted',
    submittedAt: s.submittedAt || new Date().toISOString(),
  };
}

export const classroomService = {
  async getClassrooms(params?: { search?: string; status?: string }): Promise<Classroom[]> {
    try {
      // 1. Primary: Supabase PostgreSQL
      const sbClassrooms = await supabaseDataService.getClassrooms();
      if (sbClassrooms && sbClassrooms.length > 0) {
        return sbClassrooms;
      }

      // 2. Fallback: Backend
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.append('search', params.search);
      if (params?.status) queryParams.append('status', params.status);
      const url = `/classrooms${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      
      const res = await apiClient.get<any>(url);
      const list = res.data?.data || res.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map(mapBackendClassroom);
      }
    } catch (err) {
      console.warn('[classroomService] Failed to fetch classrooms notice:', err);
    }
    return [];
  },

  async getClassroomById(id: string): Promise<Classroom | undefined> {
    try {
      const sbClassrooms = await supabaseDataService.getClassrooms();
      const match = sbClassrooms.find(c => c.id === id);
      if (match) return match;

      const res = await apiClient.get<any>(`/classrooms/${id}`);
      const data = res.data?.data || res.data;
      if (data && data.id) {
        return mapBackendClassroom(data);
      }
    } catch (err) {
      console.warn(`[classroomService] Failed to fetch classroom ${id}:`, err);
    }
    return undefined;
  },

  async createClassroom(
    name: string,
    description: string,
    startDate: string,
    submissionDeadline: string,
    submissionMode: 'Individual' | 'Team',
    resources: ClassroomResourceRequirement[],
    options?: { logo?: string; minTeamSize?: number; maxTeamSize?: number }
  ): Promise<Classroom> {
    try {
      const createdSb = await supabaseDataService.createClassroom({
        name,
        description,
        startDate,
        submissionDeadline,
        submissionMode,
        resources,
        logo: options?.logo,
        minTeamSize: options?.minTeamSize,
        maxTeamSize: options?.maxTeamSize,
      });

      apiClient.post('/classrooms', {
        name,
        description,
        logo: options?.logo,
        startDate,
        deadline: submissionDeadline,
        submissionMode,
        minTeamSize: options?.minTeamSize,
        maxTeamSize: options?.maxTeamSize,
        resources,
      }).catch(() => {});

      return createdSb;
    } catch (err: any) {
      console.warn('[classroomService] Supabase createClassroom notice, trying backend:', err);
    }

    try {
      const res = await apiClient.post<any>('/classrooms', {
        name,
        description,
        logo: options?.logo,
        startDate,
        deadline: submissionDeadline,
        submissionMode,
        minTeamSize: options?.minTeamSize,
        maxTeamSize: options?.maxTeamSize,
        resources,
      });
      const created = res.data?.data || res.data;
      if (created && created.id) {
        return mapBackendClassroom(created);
      }
      return mapBackendClassroom(res);
    } catch (err: any) {
      console.warn('[classroomService] Backend createClassroom failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to create classroom';
      throw new Error(msg);
    }
  },

  async updateClassroom(id: string, updateData: any): Promise<Classroom> {
    try {
      const payload: any = { ...updateData };
      if (updateData.submissionDeadline) {
        payload.deadline = updateData.submissionDeadline;
      }
      const res = await apiClient.put<any>(`/classrooms/${id}`, payload);
      const data = res.data?.data || res.data;
      if (data && data.id) {
        return mapBackendClassroom(data);
      }
      return mapBackendClassroom(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to update classroom configuration';
      throw new Error(msg);
    }
  },

  async deleteClassroom(id: string): Promise<boolean> {
    try {
      await apiClient.delete(`/classrooms/${id}`);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete classroom';
      throw new Error(msg);
    }
  },

  async verifyCode(code: string): Promise<{ success: boolean; data?: any; message?: string }> {
    const cleanCode = code.trim().toUpperCase();
    try {
      const res = await apiClient.post<any>('/classrooms/verify-code', { code: cleanCode });
      const data = res.data?.data || res.data;
      return {
        success: true,
        data,
        message: 'Classroom verified',
      };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid Classroom Code';
      return { success: false, message: msg };
    }
  },

  async joinByCode(code: string, teamIdentifier?: string): Promise<{ success: boolean; message: string; classroomId?: string; status?: string }> {
    const cleanCode = code.trim().toUpperCase();
    try {
      const res = await apiClient.post<any>('/classrooms/join-code', { code: cleanCode, teamIdentifier });
      const data = res.data?.data || res.data;
      return {
        success: true,
        message: res.data?.message || 'Join request submitted!',
        classroomId: data?.classroomId,
        status: data?.status,
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to join classroom cohort.';
      return { success: false, message };
    }
  },

  async approveMember(classroomId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.put<any>(`/classrooms/${classroomId}/members/${userId}/approve`);
      return { success: true, message: res.data?.message || 'Participant approved!' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message || 'Failed to approve member' };
    }
  },

  async rejectMember(classroomId: string, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.put<any>(`/classrooms/${classroomId}/members/${userId}/reject`);
      return { success: true, message: res.data?.message || 'Participant rejected' };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || err.message || 'Failed to reject member' };
    }
  },

  async uploadLogo(file: File, classroomId?: string): Promise<string> {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid image format. Please upload PNG, JPG, WEBP, or GIF.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Classroom logo size must be less than 5MB.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        if (classroomId) {
          try {
            await apiClient.post(`/classrooms/${classroomId}/logo`, { logo: base64Data });
          } catch (err) {
            console.warn('[classroomService] Backend logo upload failed, using data URI:', err);
          }
        }
        resolve(base64Data);
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  },

  async inviteUser(
    classroomId: string, 
    email: string, 
    role: 'EVALUATOR' | 'MEMBER' = 'MEMBER'
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(`/classrooms/${classroomId}/invite`, { email, role });
      return {
        success: true,
        message: res.data?.message || `Invitation dispatched to ${email}`,
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to send classroom invitation.';
      return { success: false, message };
    }
  },

  async assignEvaluator(
    classroomId: string, 
    evaluatorIdentifier: string, 
    submissionId?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(`/classrooms/${classroomId}/evaluators`, {
        evaluatorId: evaluatorIdentifier,
        submissionId,
      });
      return {
        success: true,
        message: res.data?.message || 'Evaluator assigned successfully',
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.message || 'Failed to assign evaluator.';
      return { success: false, message };
    }
  },

  async removeEvaluator(classroomId: string, evaluatorAssignmentId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/classrooms/${classroomId}/evaluators/${evaluatorAssignmentId}`);
      return true;
    } catch (err) {
      console.warn('[classroomService] Failed to remove evaluator:', err);
      return false;
    }
  },

  async getSubmissionsByClassroom(classroomId: string): Promise<ClassroomSubmission[]> {
    try {
      const res = await apiClient.get<any>(`/classrooms/${classroomId}/submissions`);
      const list = res.data?.data || res.data;
      if (Array.isArray(list)) {
        return list.map(mapBackendSubmission);
      }
    } catch (err) {
      console.warn(`[classroomService] Failed to fetch submissions for classroom ${classroomId}:`, err);
    }
    return [];
  },

  async getSubmissionById(id: string): Promise<ClassroomSubmission | undefined> {
    try {
      const res = await apiClient.get<any>(`/submissions/${id}`);
      const data = res.data?.data || res.data;
      if (data && data.id) {
        return mapBackendSubmission(data);
      }
    } catch (err) {
      console.warn(`[classroomService] Failed to fetch submission ${id}:`, err);
    }
    return undefined;
  },

  async submitProject(submissionData: Omit<ClassroomSubmission, 'id' | 'submittedAt' | 'status'>): Promise<ClassroomSubmission> {
    try {
      const p = submissionData.project;
      const payload: any = {
        title: p.title,
        category: p.category,
        description: p.description,
        problemStatement: p.problemStatement,
        proposedSolution: p.proposedSolution,
        objectives: p.objectives,
        innovation: p.innovation,
        features: p.features,
        targetUsers: p.targetUsers,
        technologies: p.technologies,
        programmingLanguages: p.programmingLanguages,
        testingApproach: p.testingApproach,
        limitations: p.limitations,
        futureEnhancements: p.futureEnhancements,
        githubUrl: p.githubUrl || undefined,
        liveDemoUrl: p.liveDemoUrl || undefined,
        teamId: submissionData.teamId,
        resources: p.resources?.map(r => ({
          type: r.type,
          name: r.name,
          size: r.size,
          status: r.status || 'uploaded',
        })),
      };

      const res = await apiClient.post<any>(`/classrooms/${submissionData.classroomId}/submissions`, payload);
      const data = res.data?.data || res.data;
      if (data && data.id) {
        return mapBackendSubmission(data);
      }
      return mapBackendSubmission(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit project to classroom.';
      throw new Error(msg);
    }
  }
};

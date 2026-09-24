import { ClassroomSubmission, FacultyEvaluation, ClassroomVerification } from '../types';
import { apiClient } from './api/apiClient';
import { mapBackendSubmission } from './classroomService';

export const evaluationService = {
  async submitFacultyEvaluation(
    submissionId: string,
    evaluation: Omit<FacultyEvaluation, 'totalFacultyScore'>
  ): Promise<ClassroomSubmission> {
    try {
      const res = await apiClient.post<any>(`/submissions/${submissionId}/faculty-evaluation`, {
        pptDemoScore: evaluation.pptDemoScore,
        vivaQuestions: evaluation.vivaQuestions,
        vivaTotalScore: evaluation.vivaTotalScore,
        status: evaluation.status,
        reason: evaluation.reason,
        feedback: evaluation.feedback,
      });
      const data = res.data?.data || res.data;
      if (data && data.id) {
        return mapBackendSubmission(data);
      }
      return mapBackendSubmission(res);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit faculty evaluation';
      throw new Error(msg);
    }
  },

  async verifySubmission(
    submissionId: string,
    verification: ClassroomVerification
  ): Promise<ClassroomSubmission> {
    try {
      if (verification.status === 'Approved') {
        const res = await apiClient.post<any>(`/submissions/${submissionId}/verify`);
        const data = res.data?.data || res.data;
        if (data && data.id) return mapBackendSubmission(data);
        return mapBackendSubmission(res);
      } else if (verification.status === 'Returned') {
        const res = await apiClient.post<any>(`/submissions/${submissionId}/return`, {
          returnReason: verification.returnReason || 'Revision requested by reviewer',
        });
        const data = res.data?.data || res.data;
        if (data && data.id) return mapBackendSubmission(data);
        return mapBackendSubmission(res);
      }
      throw new Error('Unsupported verification status');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to verify submission';
      throw new Error(msg);
    }
  },

  async getLeaderboard(classroomId: string): Promise<any> {
    try {
      const res = await apiClient.get<any>(`/classrooms/${classroomId}/leaderboard`);
      return res.data?.data || res.data;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch leaderboard';
      throw new Error(msg);
    }
  },

  async getClassroomVerifications(classroomId: string): Promise<ClassroomSubmission[]> {
    try {
      const res = await apiClient.get<any>(`/classrooms/${classroomId}/verification`);
      const list = res.data?.data || res.data;
      if (Array.isArray(list)) {
        return list.map(mapBackendSubmission);
      }
      return [];
    } catch (err: any) {
      console.warn('Backend getClassroomVerifications failed:', err);
      return [];
    }
  },
};

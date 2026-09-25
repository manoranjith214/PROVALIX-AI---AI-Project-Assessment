import { Team, TeamMember, TeamInvitation } from '../types';
import { apiClient } from './api/apiClient';
import { supabaseDataService } from './supabaseDataService';

export const teamService = {
  /**
   * Helper to normalize backend Prisma team model into frontend Team interface
   */
  mapBackendTeam(b: any): Team {
    const members: TeamMember[] = Array.isArray(b.members)
      ? b.members.map((m: any) => ({
          userId: m.userId || m.user?.id || m.id || '',
          permanentId: m.user?.permanentId || m.permanentId || 'PRV-USER',
          name: m.user?.name || m.name || 'Squad Member',
          email: m.user?.email || m.email || '',
          role: m.role || (b.captainId === (m.userId || m.user?.id) ? 'Captain' : 'Member'),
          joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        }))
      : [];

    const invitations: TeamInvitation[] = Array.isArray(b.invitations)
      ? b.invitations.map((inv: any) => ({
          id: inv.id,
          teamId: inv.teamId || b.id,
          userId: inv.userId || '',
          permanentId: inv.user?.permanentId || inv.permanentId || 'PRV-INVITED',
          userName: inv.user?.name || inv.userName || 'Invited User',
          userEmail: inv.user?.email || inv.userEmail || '',
          status: inv.status || 'Pending',
          invitedAt: inv.invitedAt || inv.createdAt || new Date().toISOString(),
        }))
      : [];

    return {
      id: b.id,
      name: b.name,
      logo: b.logo || undefined,
      code: b.code,
      maxSize: b.maxSize || 4,
      captainId: b.captainId || b.createdById || '',
      captainName: b.captain?.name,
      captainEmail: b.captain?.email,
      captainPermanentId: b.captain?.permanentId,
      members,
      invitations,
      status: b.status || 'Active',
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
      isBackend: true,
      submissions: b.submissions || [],
    };
  },

  async getTeams(): Promise<Team[]> {
    try {
      // 1. Primary: Supabase PostgreSQL
      const sbTeams = await supabaseDataService.getTeams();
      if (sbTeams && sbTeams.length > 0) {
        return sbTeams;
      }

      // 2. Fallback: Backend
      const data = await apiClient.get<any[]>('/teams');
      if (Array.isArray(data) && data.length > 0) {
        return data.map(this.mapBackendTeam);
      }
    } catch (err) {
      console.warn('[teamService] getTeams notice:', err);
    }
    return [];
  },

  async getTeamById(id: string): Promise<Team | undefined> {
    try {
      const sbTeams = await supabaseDataService.getTeams();
      const match = sbTeams.find(t => t.id === id);
      if (match) return match;

      const data = await apiClient.get<any>(`/teams/${id}`);
      if (data) {
        return this.mapBackendTeam(data);
      }
    } catch {
      // Not found or error
    }
    return undefined;
  },

  async uploadLogo(file: File, teamId?: string): Promise<string> {
    const formData = new FormData();
    formData.append('logo', file);

    try {
      const endpoint = teamId ? `/teams/${teamId}/logo` : '/teams/upload-logo';
      const res = await apiClient.post<{ logoUrl?: string; logo?: string }>(endpoint, formData);
      const logoUrl = res.logoUrl || res.logo;
      if (logoUrl) return logoUrl;
    } catch (err) {
      console.warn('[teamService] Backend uploadLogo failed, falling back to data URL:', err);
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async createTeam(name: string, logo?: string, maxSize = 4): Promise<Team> {
    try {
      const createdSb = await supabaseDataService.createTeam({ name, logo, maxSize });
      apiClient.post('/teams', { name, logo, maxSize }).catch(() => {});
      return createdSb;
    } catch (err) {
      console.warn('[teamService] Supabase createTeam notice, trying backend:', err);
    }

    const data = await apiClient.post<any>('/teams', {
      name,
      logo: logo || undefined,
      maxSize,
    });
    return this.mapBackendTeam(data);
  },

  async inviteMember(teamId: string, permanentIdOrUserId: string): Promise<{ success: boolean; message: string; team?: Team }> {
    try {
      await apiClient.post<any>(`/teams/${teamId}/invites`, {
        userId: permanentIdOrUserId.trim(),
      });
      const updated = await this.getTeamById(teamId);
      return { success: true, message: `Invitation dispatched to "${permanentIdOrUserId}".`, team: updated };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to dispatch invitation.';
      return { success: false, message: msg };
    }
  },

  async getMyInvitations(): Promise<any[]> {
    try {
      const data = await apiClient.get<any[]>('/teams/invites/pending');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async acceptInvite(inviteId: string): Promise<{ success: boolean; message: string; teamId?: string }> {
    try {
      const res = await apiClient.post<any>(`/teams/invites/${inviteId}/accept`);
      return { success: true, message: res?.message || 'Invitation accepted successfully.', teamId: res?.teamId };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to accept invitation.' };
    }
  },

  async rejectInvite(inviteId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(`/teams/invites/${inviteId}/reject`);
      return { success: true, message: res?.message || 'Invitation declined.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to decline invitation.' };
    }
  },

  async removeMember(teamId: string, memberUserId: string): Promise<Team> {
    await apiClient.delete<any>(`/teams/${teamId}/members/${memberUserId}`);
    const updated = await this.getTeamById(teamId);
    if (!updated) throw new Error('Team not found');
    return updated;
  },

  async leaveTeam(teamId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(`/teams/${teamId}/leave`);
      return { success: true, message: res?.message || 'Successfully departed from team.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to leave team.' };
    }
  },

  async transferCaptainship(teamId: string, newCaptainUserId: string): Promise<Team> {
    const res = await apiClient.put<any>(`/teams/${teamId}/captain`, {
      newCaptainId: newCaptainUserId,
    });
    return this.mapBackendTeam(res);
  },

  async updateTeam(
    teamId: string,
    data: { name?: string; logo?: string; maxSize?: number; status?: string }
  ): Promise<Team> {
    const res = await apiClient.put<any>(`/teams/${teamId}`, data);
    return this.mapBackendTeam(res);
  },

  async archiveTeam(teamId: string): Promise<{ success: boolean; message: string; team?: Team }> {
    try {
      const res = await apiClient.post<any>(`/teams/${teamId}/archive`);
      const updated = await this.getTeamById(teamId);
      return { success: true, message: res?.message || 'Team archived successfully', team: updated };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err?.message || 'Failed to archive team' };
    }
  },

  async deactivateTeam(teamId: string): Promise<{ success: boolean; message: string; team?: Team }> {
    try {
      const res = await apiClient.post<any>(`/teams/${teamId}/deactivate`);
      const updated = await this.getTeamById(teamId);
      return { success: true, message: res?.message || 'Team deactivated successfully', team: updated };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err?.message || 'Failed to deactivate team' };
    }
  },

  async deleteTeam(teamId: string): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.delete<any>(`/teams/${teamId}`);
      return { success: true, message: res?.message || 'Team deleted successfully' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete team';
      return { success: false, message: msg };
    }
  },

  // --- Classroom Participation & Approval Gate ---

  async requestClassroomParticipation(
    teamId: string,
    classroomIdOrCode: string
  ): Promise<{ success: boolean; message: string; participation?: any }> {
    const isCode = classroomIdOrCode.toUpperCase().startsWith('CLS-') || classroomIdOrCode.length < 15;
    const payload = isCode ? { classroomCode: classroomIdOrCode } : { classroomId: classroomIdOrCode };

    try {
      const res = await apiClient.post<any>(`/teams/${teamId}/classrooms/request`, payload);
      return { success: true, message: 'Classroom participation request submitted!', participation: res };
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to request classroom participation';
      return { success: false, message: msg };
    }
  },

  async getTeamClassroomParticipations(teamId: string): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>(`/teams/${teamId}/classrooms`);
      if (Array.isArray(res)) return res;
    } catch {
      // Return empty array
    }
    return [];
  },

  async withdrawClassroomParticipation(
    teamId: string,
    participationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.post<any>(`/teams/${teamId}/classrooms/${participationId}/withdraw`);
      return { success: true, message: res?.message || 'Participation withdrawn' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || err?.message || 'Failed to withdraw' };
    }
  },

  async getClassroomTeamParticipations(classroomId: string): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>(`/classrooms/${classroomId}/team-participations`);
      if (Array.isArray(res)) return res;
    } catch {
      // Return empty array
    }
    return [];
  },

  async approveClassroomParticipation(
    classroomId: string,
    participationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.put<any>(
        `/classrooms/${classroomId}/team-participations/${participationId}/approve`
      );
      return { success: true, message: res?.message || 'Team participation approved!' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to approve participation' };
    }
  },

  async rejectClassroomParticipation(
    classroomId: string,
    participationId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.put<any>(
        `/classrooms/${classroomId}/team-participations/${participationId}/reject`
      );
      return { success: true, message: res?.message || 'Participation rejected.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to reject participation' };
    }
  },
};

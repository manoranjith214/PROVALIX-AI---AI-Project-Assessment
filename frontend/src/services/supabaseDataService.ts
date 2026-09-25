import { supabase } from '../lib/supabase';
import { User, ProjectDetails, StandaloneAIEvaluation, Team, Classroom, AppNotification } from '../types';

/**
 * Normalizes a raw Supabase profile row into application User object
 */
export function mapSupabaseProfile(p: any): User {
  return {
    id: p.id,
    name: p.full_name || p.name || p.email?.split('@')[0] || 'User',
    email: p.email || '',
    permanentId: p.permanent_id || `PRV-${p.id.slice(0, 5)}`,
    department: p.department || 'Computer Science & Engineering',
    year: p.year || '1st Year',
    college: p.college || 'Apex Institute of Technology & Research',
    avatar: p.avatar_url || p.avatar || undefined,
    profileImage: p.avatar_url || p.profileImage || undefined,
    role: p.role || 'Student',
    phone: p.phone || undefined,
    dob: p.dob || undefined,
    location: p.location || undefined,
    bio: p.bio || undefined,
    degree: p.degree || undefined,
    section: p.section || undefined,
    registerNumber: p.register_number || undefined,
    expectedGraduationYear: p.expected_graduation_year || undefined,
    skills: p.skills || undefined,
    authProvider: 'email',
    createdAt: p.created_at || new Date().toISOString(),
    updatedAt: p.updated_at || new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };
}

/**
 * Service to directly interact with Supabase PostgreSQL tables
 * protected by Row Level Security (auth.uid() = user_id / auth.uid() = id).
 */
export const supabaseDataService = {
  // ==========================================
  // AUTHENTICATION & PROFILE HELPERS
  // ==========================================

  async getCurrentSessionUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  /**
   * Checks whether an institutional/personal email is already registered.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_email_exists', {
        p_email: email.trim().toLowerCase(),
      });
      if (error) {
        // Fallback: direct profiles query (if policy allows or if table accessible)
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email.trim().toLowerCase())
          .maybeSingle();
        return Boolean(profile);
      }
      return Boolean(data);
    } catch {
      return false;
    }
  },

  /**
   * Resolves email associated with a Permanent User ID (e.g. PRV-10482).
   */
  async getEmailByPermanentId(permanentId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_email_by_permanent_id', {
        p_permanent_id: permanentId.trim().toUpperCase(),
      });
      if (error || !data) {
        return null;
      }
      return data as string;
    } catch {
      return null;
    }
  },

  /**
   * Generates a unique Permanent User ID formatted as PRV-XXXXX.
   */
  async generateUniquePermanentId(): Promise<string> {
    for (let attempts = 0; attempts < 5; attempts++) {
      const randomNum = Math.floor(10000 + Math.random() * 90000);
      const candidate = `PRV-${randomNum}`;
      const existingEmail = await this.getEmailByPermanentId(candidate);
      if (!existingEmail) {
        return candidate;
      }
    }
    return `PRV-${Math.floor(10000 + Math.random() * 90000)}`;
  },

  async syncUserProfile(user: {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string;
    permanent_id?: string;
    department?: string;
    year?: string;
    college?: string;
    user_metadata?: any;
  }): Promise<User> {
    const meta = user.user_metadata || {};
    const email = user.email || '';
    const fullName = user.full_name || meta.full_name || meta.name || email.split('@')[0] || 'User';
    const avatarUrl = user.avatar_url || meta.profile_image || meta.avatar_url || null;
    const permanentId = user.permanent_id || meta.permanent_user_id || meta.permanent_id || `PRV-${Math.floor(10000 + Math.random() * 90000)}`;
    const department = user.department || meta.department || 'Computer Science & Engineering';
    const year = user.year || meta.year || '1st Year';
    const college = user.college || meta.college || 'Apex Institute of Technology & Research';

    const payload = {
      id: user.id,
      email,
      full_name: fullName,
      avatar_url: avatarUrl,
      permanent_id: permanentId,
      department,
      year,
      college,
      role: 'Student',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      console.warn('[supabaseDataService] syncUserProfile notice:', error.message);
      return mapSupabaseProfile(payload);
    }

    return mapSupabaseProfile(data);
  },

  async fetchUserProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('[supabaseDataService] fetchUserProfile notice:', error.message);
      return null;
    }

    return mapSupabaseProfile(data);
  },

  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const dbPayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbPayload.full_name = updates.name;
    if (updates.avatar !== undefined || updates.profileImage !== undefined) {
      dbPayload.avatar_url = updates.avatar || updates.profileImage;
    }
    if (updates.department !== undefined) dbPayload.department = updates.department;
    if (updates.year !== undefined) dbPayload.year = updates.year;
    if (updates.college !== undefined) dbPayload.college = updates.college;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.phone !== undefined) dbPayload.phone = updates.phone;
    if (updates.dob !== undefined) dbPayload.dob = updates.dob;
    if (updates.location !== undefined) dbPayload.location = updates.location;
    if (updates.bio !== undefined) dbPayload.bio = updates.bio;
    if (updates.degree !== undefined) dbPayload.degree = updates.degree;
    if (updates.section !== undefined) dbPayload.section = updates.section;
    if (updates.registerNumber !== undefined) dbPayload.register_number = updates.registerNumber;
    if (updates.expectedGraduationYear !== undefined) dbPayload.expected_graduation_year = updates.expectedGraduationYear;
    if (updates.skills !== undefined) dbPayload.skills = updates.skills;

    const { data, error } = await supabase
      .from('profiles')
      .update(dbPayload)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] updateUserProfile error:', error.message);
      throw error;
    }

    return mapSupabaseProfile(data);
  },

  // ==========================================
  // PROJECT PERSISTENCE (public.projects)
  // ==========================================

  async getProjects(userId?: string): Promise<any[]> {
    const uid = userId || (await this.getCurrentSessionUser())?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[supabaseDataService] getProjects error:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      title: p.title,
      category: p.category,
      description: p.description,
      problemStatement: p.problem_statement,
      proposedSolution: p.proposed_solution,
      objectives: p.objectives,
      innovation: p.innovation,
      features: p.features,
      targetUsers: p.target_users,
      technologies: p.technologies || [],
      programmingLanguages: p.programming_languages || [],
      testingApproach: p.testing_approach,
      limitations: p.limitations,
      futureEnhancements: p.future_enhancements,
      githubUrl: p.github_url,
      liveDemoUrl: p.live_demo_url,
      resources: p.resources || [],
      aiEvaluation: p.ai_evaluation,
      plagiarism: p.plagiarism,
      status: p.status || 'Evaluated',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  async getProjectById(id: string): Promise<ProjectDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      title: data.title,
      category: data.category || 'General Computing & AI',
      description: data.description || '',
      problemStatement: data.problem_statement || '',
      proposedSolution: data.proposed_solution || '',
      objectives: data.objectives || '',
      innovation: data.innovation || '',
      features: data.features || '',
      targetUsers: data.target_users || '',
      technologies: data.technologies || [],
      programmingLanguages: data.programming_languages || [],
      testingApproach: data.testing_approach || '',
      limitations: data.limitations || '',
      futureEnhancements: data.future_enhancements || '',
      githubUrl: data.github_url,
      liveDemoUrl: data.live_demo_url,
      resources: data.resources || [],
      createdAt: data.created_at,
    };
  },

  async createProject(projectData: any): Promise<any> {
    const user = await this.getCurrentSessionUser();
    if (!user) {
      throw new Error('User must be authenticated to create a project');
    }

    const payload = {
      user_id: user.id,
      title: projectData.title,
      category: projectData.category || 'General Computing & AI',
      description: projectData.description || '',
      problem_statement: projectData.problemStatement || '',
      proposed_solution: projectData.proposedSolution || '',
      objectives: projectData.objectives || '',
      innovation: projectData.innovation || '',
      features: projectData.features || '',
      target_users: projectData.targetUsers || '',
      technologies: projectData.technologies || [],
      programming_languages: projectData.programmingLanguages || [],
      testing_approach: projectData.testingApproach || '',
      limitations: projectData.limitations || '',
      future_enhancements: projectData.futureEnhancements || '',
      github_url: projectData.githubUrl || null,
      live_demo_url: projectData.liveDemoUrl || null,
      resources: projectData.resources || [],
      ai_evaluation: projectData.aiEvaluation || null,
      plagiarism: projectData.plagiarism || null,
      status: projectData.status || 'Evaluated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] createProject error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      category: data.category,
      createdAt: data.created_at,
      ...projectData,
    };
  },

  async updateProject(id: string, updates: any): Promise<any> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.problemStatement !== undefined) dbUpdates.problem_statement = updates.problemStatement;
    if (updates.proposedSolution !== undefined) dbUpdates.proposed_solution = updates.proposedSolution;
    if (updates.objectives !== undefined) dbUpdates.objectives = updates.objectives;
    if (updates.innovation !== undefined) dbUpdates.innovation = updates.innovation;
    if (updates.features !== undefined) dbUpdates.features = updates.features;
    if (updates.targetUsers !== undefined) dbUpdates.target_users = updates.targetUsers;
    if (updates.technologies !== undefined) dbUpdates.technologies = updates.technologies;
    if (updates.programmingLanguages !== undefined) dbUpdates.programming_languages = updates.programmingLanguages;
    if (updates.testingApproach !== undefined) dbUpdates.testing_approach = updates.testingApproach;
    if (updates.limitations !== undefined) dbUpdates.limitations = updates.limitations;
    if (updates.futureEnhancements !== undefined) dbUpdates.future_enhancements = updates.futureEnhancements;
    if (updates.githubUrl !== undefined) dbUpdates.github_url = updates.githubUrl;
    if (updates.liveDemoUrl !== undefined) dbUpdates.live_demo_url = updates.liveDemoUrl;
    if (updates.resources !== undefined) dbUpdates.resources = updates.resources;
    if (updates.aiEvaluation !== undefined) dbUpdates.ai_evaluation = updates.aiEvaluation;
    if (updates.plagiarism !== undefined) dbUpdates.plagiarism = updates.plagiarism;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] updateProject error:', error.message);
      throw error;
    }

    return data;
  },

  async deleteProject(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[supabaseDataService] deleteProject error:', error.message);
      throw error;
    }

    return true;
  },

  async saveEvaluation(projectId: string, evaluation: StandaloneAIEvaluation, plagiarism?: any): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({
        ai_evaluation: evaluation,
        plagiarism: plagiarism || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) {
      console.warn('[supabaseDataService] saveEvaluation notice:', error.message);
    }
  },

  async getStandaloneEvaluations(): Promise<StandaloneAIEvaluation[]> {
    const projects = await this.getProjects();
    const evals: StandaloneAIEvaluation[] = [];

    projects.forEach((p: any) => {
      if (p.aiEvaluation) {
        evals.push({
          ...p.aiEvaluation,
          id: p.aiEvaluation.id || p.id,
          projectId: p.id,
        });
      }
    });

    return evals;
  },

  // ==========================================
  // TEAMS PERSISTENCE (public.teams)
  // ==========================================

  async getTeams(userId?: string): Promise<Team[]> {
    const uid = userId || (await this.getCurrentSessionUser())?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[supabaseDataService] getTeams error:', error.message);
      return [];
    }

    return (data || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      code: t.code,
      logo: t.logo || undefined,
      maxSize: t.max_size || 4,
      captainId: t.captain_id || uid,
      captainName: t.captain_name || 'Captain',
      captainEmail: t.captain_email || '',
      captainPermanentId: t.captain_permanent_id || 'PRV-CPT',
      members: t.members || [],
      invitations: t.invitations || [],
      submissions: t.submissions || [],
      status: t.status || 'Active',
      createdAt: t.created_at,
    }));
  },

  async createTeam(teamData: Partial<Team>): Promise<Team> {
    const user = await this.getCurrentSessionUser();
    if (!user) throw new Error('User must be authenticated to create a team');

    const code = teamData.code || `TM-${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      user_id: user.id,
      name: teamData.name || 'My Squad',
      code,
      logo: teamData.logo || null,
      max_size: teamData.maxSize || 4,
      captain_id: user.id,
      captain_name: teamData.captainName || user.user_metadata?.full_name || 'Captain',
      captain_email: user.email || '',
      captain_permanent_id: teamData.captainPermanentId || `PRV-${user.id.slice(0, 5)}`,
      members: teamData.members || [
        {
          userId: user.id,
          permanentId: `PRV-${user.id.slice(0, 5)}`,
          name: user.user_metadata?.full_name || 'Captain',
          email: user.email || '',
          role: 'Captain',
          joinedAt: new Date().toISOString().split('T')[0],
        },
      ],
      invitations: teamData.invitations || [],
      submissions: teamData.submissions || [],
      status: 'Active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('teams')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] createTeam error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      logo: data.logo || undefined,
      maxSize: data.max_size,
      captainId: data.captain_id,
      captainName: data.captain_name,
      captainEmail: data.captain_email,
      captainPermanentId: data.captain_permanent_id,
      members: data.members || [],
      invitations: data.invitations || [],
      submissions: data.submissions || [],
      status: data.status,
      createdAt: data.created_at,
    };
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.logo !== undefined) dbUpdates.logo = updates.logo;
    if (updates.maxSize !== undefined) dbUpdates.max_size = updates.maxSize;
    if (updates.members !== undefined) dbUpdates.members = updates.members;
    if (updates.invitations !== undefined) dbUpdates.invitations = updates.invitations;
    if (updates.submissions !== undefined) dbUpdates.submissions = updates.submissions;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    const { data, error } = await supabase
      .from('teams')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] updateTeam error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      logo: data.logo || undefined,
      maxSize: data.max_size,
      captainId: data.captain_id,
      captainName: data.captain_name,
      captainEmail: data.captain_email,
      captainPermanentId: data.captain_permanent_id,
      members: data.members || [],
      invitations: data.invitations || [],
      submissions: data.submissions || [],
      status: data.status,
      createdAt: data.created_at,
    };
  },

  async deleteTeam(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[supabaseDataService] deleteTeam error:', error.message);
      throw error;
    }

    return true;
  },

  // ==========================================
  // CLASSROOMS PERSISTENCE (public.classrooms)
  // ==========================================

  async getClassrooms(userId?: string): Promise<Classroom[]> {
    const uid = userId || (await this.getCurrentSessionUser())?.id;
    if (!uid) return [];

    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[supabaseDataService] getClassrooms error:', error.message);
      return [];
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      logo: c.logo || undefined,
      ownerId: c.owner_id || uid,
      startDate: c.start_date,
      submissionDeadline: c.deadline,
      submissionMode: (c.submission_mode || 'Individual') as 'Individual' | 'Team',
      minTeamSize: c.min_team_size || 2,
      maxTeamSize: c.max_team_size || 4,
      resources: c.resources_config || [],
      status: c.status || 'Active',
      members: c.members || [],
      invitations: c.invitations || [],
      createdAt: c.created_at,
    }));
  },

  async createClassroom(classroomData: Partial<Classroom>): Promise<Classroom> {
    const user = await this.getCurrentSessionUser();
    if (!user) throw new Error('User must be authenticated to create a classroom');

    const code = classroomData.code || `CLS-${Math.floor(10000 + Math.random() * 90000)}`;
    const payload = {
      user_id: user.id,
      name: classroomData.name || 'New Classroom',
      code,
      description: classroomData.description || '',
      logo: classroomData.logo || null,
      owner_id: user.id,
      start_date: classroomData.startDate || new Date().toISOString(),
      deadline: classroomData.submissionDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      submission_mode: classroomData.submissionMode || 'Individual',
      min_team_size: classroomData.minTeamSize || 2,
      max_team_size: classroomData.maxTeamSize || 4,
      resources_config: classroomData.resources || [],
      status: 'Active',
      members: classroomData.members || [],
      invitations: classroomData.invitations || [],
      submissions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('classrooms')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[supabaseDataService] createClassroom error:', error.message);
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      description: data.description,
      logo: data.logo || undefined,
      ownerId: data.owner_id,
      startDate: data.start_date,
      submissionDeadline: data.deadline,
      submissionMode: data.submission_mode as 'Individual' | 'Team',
      minTeamSize: data.min_team_size,
      maxTeamSize: data.max_team_size,
      resources: data.resources_config || [],
      status: data.status,
      members: data.members || [],
      invitations: data.invitations || [],
      createdAt: data.created_at,
    };
  },

  // ==========================================
  // SETTINGS PERSISTENCE (public.user_settings)
  // ==========================================

  async getUserSettings(userId?: string): Promise<any> {
    const uid = userId || (await this.getCurrentSessionUser())?.id;
    if (!uid) return null;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) {
      console.warn('[supabaseDataService] getUserSettings notice:', error.message);
      return null;
    }

    return data;
  },

  async saveUserSettings(field: 'notification_preferences' | 'privacy_preferences' | 'evaluation_preferences' | 'ai_settings', value: any): Promise<void> {
    const user = await this.getCurrentSessionUser();
    if (!user) return;

    const payload: any = {
      user_id: user.id,
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[supabaseDataService] saveUserSettings error:', error.message);
    }
  },
};

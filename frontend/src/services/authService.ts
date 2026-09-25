import { User } from '../types';
import { apiClient } from './api/apiClient';
import { tokenStorage } from './api/tokenStorage';
import { Storage } from './storage';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  department?: string;
  year?: string;
  college?: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

const normalizeUser = (rawUser: any): User => {
  const cached = tokenStorage.getCachedUser();
  const isSameUser = cached && (cached.id === rawUser.id || cached.permanentId === rawUser.permanentId);

  return {
    id: rawUser.id,
    name: rawUser.name,
    email: rawUser.email,
    permanentId: rawUser.permanentId || `PRV-${rawUser.id?.slice(0, 5) || '10000'}`,
    department: rawUser.department || 'Computer Science & Engineering',
    year: rawUser.year || '1st Year',
    college: rawUser.college || 'Apex Institute of Technology & Research',
    avatar: rawUser.profileImage || rawUser.avatar,
    profileImage: rawUser.profileImage,
    role: rawUser.role,
    createdAt: rawUser.createdAt || (isSameUser ? cached?.createdAt : undefined),
    updatedAt: rawUser.updatedAt || (isSameUser ? cached?.updatedAt : undefined),
    lastLoginAt: rawUser.lastLoginAt || (isSameUser ? cached?.lastLoginAt : undefined),
    authProvider: rawUser.authProvider || (isSameUser ? cached?.authProvider : undefined),
    phone: rawUser.phone !== undefined ? rawUser.phone : (isSameUser ? cached?.phone : undefined),
    dob: rawUser.dob !== undefined ? rawUser.dob : (isSameUser ? cached?.dob : undefined),
    location: rawUser.location !== undefined ? rawUser.location : (isSameUser ? cached?.location : undefined),
    bio: rawUser.bio !== undefined ? rawUser.bio : (isSameUser ? cached?.bio : undefined),
    degree: rawUser.degree !== undefined ? rawUser.degree : (isSameUser ? cached?.degree : undefined),
    section: rawUser.section !== undefined ? rawUser.section : (isSameUser ? cached?.section : undefined),
    registerNumber: rawUser.registerNumber !== undefined ? rawUser.registerNumber : (isSameUser ? cached?.registerNumber : undefined),
    expectedGraduationYear: rawUser.expectedGraduationYear !== undefined ? rawUser.expectedGraduationYear : (isSameUser ? cached?.expectedGraduationYear : undefined),
    skills: rawUser.skills !== undefined ? rawUser.skills : (isSameUser ? cached?.skills : undefined),
  };
};

export const authService = {
  /**
   * Fetch authenticated user profile from real backend
   */
  async getCurrentUser(): Promise<User> {
    const rawUser = await apiClient.get<any>('/auth/me');
    const user = normalizeUser(rawUser);

    tokenStorage.setCachedUser(user);
    // Sync with local Storage for other modules that still access mock storage
    Storage.setCurrentUser(user);

    return user;
  },

  /**
   * Authenticate user with email and password against real backend
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const data = await apiClient.post<AuthResult>('/auth/login', {
      email,
      password,
    });

    const user = normalizeUser(data.user);
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    tokenStorage.setCachedUser(user);
    Storage.setCurrentUser(user);

    return {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  /**
   * Authenticate via verified Supabase access token against Provalix backend
   */
  async supabaseLogin(accessToken: string): Promise<AuthResult> {
    const data = await apiClient.post<AuthResult>('/auth/supabase', {
      accessToken,
    });

    const user = normalizeUser(data.user);
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    tokenStorage.setCachedUser(user);
    Storage.setCurrentUser(user);

    return {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  /**
   * Authenticate via Google OAuth backend endpoint
   */
  async googleLogin(payload?: { token?: string; accessToken?: string }): Promise<AuthResult> {
    const token = payload?.accessToken || payload?.token;
    if (token) {
      return this.supabaseLogin(token);
    }
    const data = await apiClient.post<AuthResult>('/auth/google', payload || {});

    const user = normalizeUser(data.user);
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    tokenStorage.setCachedUser(user);
    Storage.setCurrentUser(user);

    return {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  /**
   * Register a new user on real backend
   */
  async register(
    name: string,
    email: string,
    password: string,
    extra?: { department?: string; year?: string; college?: string }
  ): Promise<AuthResult> {
    const payload: RegisterPayload = {
      name,
      email,
      password,
      department: extra?.department || 'Computer Science & Engineering',
      year: extra?.year || '1st Year',
      college: extra?.college || 'Apex Institute of Technology & Research',
    };

    const data = await apiClient.post<AuthResult>('/auth/register', payload);

    const user = normalizeUser(data.user);
    tokenStorage.setTokens(data.accessToken, data.refreshToken);
    tokenStorage.setCachedUser(user);
    Storage.setCurrentUser(user);

    return {
      user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    };
  },

  /**
   * Refresh JWT access token using stored refresh token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const data = await apiClient.post<{ accessToken: string; user?: any }>('/auth/refresh', {
      refreshToken,
    });

    tokenStorage.setAccessToken(data.accessToken);
    if (data.user) {
      const user = normalizeUser(data.user);
      tokenStorage.setCachedUser(user);
      Storage.setCurrentUser(user);
    }

    return data.accessToken;
  },

  /**
   * Request password reset instructions
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    return apiClient.post<{ message: string; resetToken?: string }>('/auth/forgot-password', {
      email,
    });
  },

  /**
   * Reset password with valid reset token
   */
  async resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/reset-password', payload);
  },

  /**
   * Update current user profile on backend
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    const backendPayload: any = {};
    if (updates.name !== undefined) backendPayload.name = updates.name;
    if (updates.department !== undefined) backendPayload.department = updates.department;
    if (updates.year !== undefined) backendPayload.year = updates.year;
    if (updates.college !== undefined) backendPayload.college = updates.college;
    if (updates.profileImage !== undefined || updates.avatar !== undefined) {
      backendPayload.profileImage = updates.profileImage || updates.avatar;
    }

    let rawUser: any = null;
    try {
      if (tokenStorage.getAccessToken() && Object.keys(backendPayload).length > 0) {
        rawUser = await apiClient.put<any>('/users/me', backendPayload);
      }
    } catch (err) {
      console.warn('[authService] Backend updateProfile fallback:', err);
    }

    const prev = tokenStorage.getCachedUser() || Storage.getCurrentUser() || {
      id: '',
      email: '',
      name: '',
      role: 'STUDENT' as const,
      avatar: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Database as source of truth: Sync to Supabase public.profiles
    if (prev.id) {
      import('./supabaseDataService').then(({ supabaseDataService }) => {
        supabaseDataService.updateUserProfile(prev.id, updates).catch(() => {});
      });
    }

    const updated: User = {
      ...prev,
      ...(rawUser ? normalizeUser(rawUser) : {}),
      ...updates,
      updatedAt: new Date().toISOString(),
    } as User;

    tokenStorage.setCachedUser(updated);
    Storage.setCurrentUser(updated);

    return updated;
  },

  /**
   * Upload user profile photo/avatar
   */
  async uploadAvatar(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('avatar', file);

    let avatarUrl: string | undefined;
    let rawUser: any = null;

    if (tokenStorage.getAccessToken()) {
      try {
        const res = await apiClient.post<{ avatarUrl: string; user?: any }>('/users/me/avatar', formData);
        avatarUrl = res.avatarUrl;
        rawUser = res.user;
      } catch (err) {
        console.warn('[authService] Backend uploadAvatar fallback to data URL:', err);
      }
    }

    if (!avatarUrl) {
      avatarUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    return this.updateProfile({
      profileImage: avatarUrl,
      avatar: avatarUrl,
    });
  },

  /**
   * Change user password via backend endpoint
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>('/users/me/password', {
      currentPassword,
      newPassword,
    });
  },

  /**
   * Logout user and revoke backend refresh token
   */
  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Continue clearing client tokens even if server logout request fails
    } finally {
      tokenStorage.clearTokens();
    }
  },
};

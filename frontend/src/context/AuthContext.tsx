import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/api/tokenStorage';
import { initializeStorage, Storage } from '../services/storage';
import { supabase, getOAuthRedirectUrl } from '../lib/supabase';
import { supabaseDataService } from '../services/supabaseDataService';

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  permanentId: '',
  department: '',
  year: '',
  college: '',
  role: 'Student',
};

interface AuthContextValue {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  googleLogin: () => Promise<void>;
  handleOAuthCallback: (accessToken: string, supabaseUser?: any) => Promise<User>;
  register: (
    name: string,
    email: string,
    password?: string,
    extra?: { department?: string; year?: string; college?: string }
  ) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  uploadPhoto: (file: File) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(() => {
    initializeStorage();
    const token = tokenStorage.getAccessToken();
    const cached = tokenStorage.getCachedUser();
    if (token && cached) {
      return cached;
    }
    return EMPTY_USER;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(tokenStorage.getAccessToken());
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    initializeStorage();

    const verifySession = async () => {
      try {
        // Step 6: On page refresh, restore Supabase session first
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Database is the source of truth: fetch profile from public.profiles
          let profile = await supabaseDataService.fetchUserProfile(session.user.id);
          if (!profile) {
            // First time sync into public.profiles
            profile = await supabaseDataService.syncUserProfile(session.user);
          }
          tokenStorage.setTokens(session.access_token, session.refresh_token);
          tokenStorage.setCachedUser(profile);
          Storage.setCurrentUser(profile);
          setUser(profile);
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Secondary check: Provalix backend JWT if not using Supabase auth directly
        const accessToken = tokenStorage.getAccessToken();
        if (accessToken) {
          try {
            const profile = await authService.getCurrentUser();
            setUser(profile);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } catch {
            const refreshToken = tokenStorage.getRefreshToken();
            if (refreshToken) {
              try {
                await authService.refreshToken();
                const profile = await authService.getCurrentUser();
                setUser(profile);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              } catch {}
            }
          }
        }

        Storage.clearAllUserData();
        tokenStorage.clearTokens();
        setUser(EMPTY_USER);
        setIsAuthenticated(false);
      } catch (err) {
        console.warn('[AuthContext] verifySession notice:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();

    const handleExternalLogout = () => {
      Storage.clearAllUserData();
      tokenStorage.clearTokens();
      setUser(EMPTY_USER);
      setIsAuthenticated(false);
    };

    window.addEventListener('provalix:auth:logout', handleExternalLogout);
    return () => window.removeEventListener('provalix:auth:logout', handleExternalLogout);
  }, []);

  const login = async (email: string, password?: string) => {
    const pwd = password || 'Password@123';
    const res = await authService.login(email, pwd);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const signInWithGoogle = async () => {
    const redirectTo = getOAuthRedirectUrl();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    });
    if (error) {
      throw error;
    }
  };

  const googleLogin = signInWithGoogle;

  const handleOAuthCallback = async (accessToken: string, supabaseUser?: any): Promise<User> => {
    // 1. Get authenticated user from session or parameter
    let sbUser = supabaseUser;
    if (!sbUser) {
      const { data: { session } } = await supabase.auth.getSession();
      sbUser = session?.user;
    }

    let syncedProfile: User;

    // 2. Database is the source of truth: Upsert user profile into public.profiles
    if (sbUser?.id) {
      syncedProfile = await supabaseDataService.syncUserProfile(sbUser);
    } else {
      syncedProfile = EMPTY_USER;
    }

    // 3. Keep backend synchronized if available
    try {
      const res = await authService.supabaseLogin(accessToken);
      if (res?.user) {
        syncedProfile = { ...syncedProfile, ...res.user };
      }
    } catch (err: any) {
      console.warn('[AuthContext] Backend /auth/supabase notice (using Supabase DB directly):', err?.message || err);
    }

    tokenStorage.setTokens(accessToken);
    tokenStorage.setCachedUser(syncedProfile);
    Storage.setCurrentUser(syncedProfile);
    setUser(syncedProfile);
    setIsAuthenticated(true);
    return syncedProfile;
  };

  const register = async (
    name: string,
    email: string,
    password?: string,
    extra?: { department?: string; year?: string; college?: string }
  ) => {
    const pwd = password || 'Password@123';
    const res = await authService.register(name, email, pwd, extra);
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user.id) {
      try {
        const updated = await supabaseDataService.updateUserProfile(user.id, updates);
        setUser(updated);
        tokenStorage.setCachedUser(updated);
        Storage.setCurrentUser(updated);
        // Also notify backend if available
        await authService.updateProfile(updates).catch(() => {});
        return;
      } catch (err) {
        console.warn('[AuthContext] Supabase profile update error, trying backend:', err);
      }
    }
    const updated = await authService.updateProfile(updates);
    setUser(updated);
  };

  const uploadPhoto = async (file: File): Promise<User> => {
    const updated = await authService.uploadAvatar(file);
    if (user.id && (updated.avatar || updated.profileImage)) {
      await supabaseDataService.updateUserProfile(user.id, {
        avatar: updated.avatar || updated.profileImage,
        profileImage: updated.avatar || updated.profileImage,
      }).catch(() => {});
    }
    setUser(updated);
    return updated;
  };

  const logout = async () => {
    try {
      await authService.logout().catch(() => {});
      await supabase.auth.signOut().catch(() => {});
    } finally {
      Storage.clearAllUserData();
      tokenStorage.clearTokens();
      setUser(EMPTY_USER);
      setIsAuthenticated(false);
      window.dispatchEvent(new CustomEvent('provalix:auth:logout'));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        signInWithGoogle,
        googleLogin,
        handleOAuthCallback,
        register,
        updateProfile,
        uploadPhoto,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

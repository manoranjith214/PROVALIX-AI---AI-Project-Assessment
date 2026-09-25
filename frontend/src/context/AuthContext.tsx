import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { tokenStorage } from '../services/api/tokenStorage';
import { initializeStorage, Storage } from '../services/storage';
import { supabase } from '../lib/supabase';
import { supabaseDataService } from '../services/supabaseDataService';
import { authService } from '../services/authService';

const EMPTY_USER: User = {
  id: '',
  name: '',
  email: '',
  permanentId: '',
  department: '',
  year: '',
  college: '',
  role: 'Student',
  authProvider: 'email',
};

interface RegisterExtra {
  department?: string;
  year?: string;
  college?: string;
  avatarUrl?: string;
  profile_image?: string;
  permanentId?: string;
  permanent_user_id?: string;
}

interface AuthContextValue {
  user: User;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  register: (
    name: string,
    email: string,
    password: string,
    extra?: RegisterExtra
  ) => Promise<User>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  uploadPhoto: (file: File) => Promise<User>;
  logout: () => Promise<void>;
  setAuthenticatedUser: (profile: User) => void;
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
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let profile = await supabaseDataService.fetchUserProfile(session.user.id);
          if (!profile) {
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

        // Secondary check: Provalix backend fallback
        const accessToken = tokenStorage.getAccessToken();
        if (accessToken) {
          try {
            const profile = await authService.getCurrentUser();
            setUser(profile);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          } catch {
            tokenStorage.clearTokens();
          }
        }

        Storage.clearAllUserData();
        tokenStorage.clearTokens();
        setUser(EMPTY_USER);
        setIsAuthenticated(false);
      } catch (err) {
        console.warn('[AuthContext] Session restoration error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    verifySession();

    // Supabase auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
        let profile = await supabaseDataService.fetchUserProfile(session.user.id);
        if (!profile) {
          profile = await supabaseDataService.syncUserProfile(session.user);
        }
        tokenStorage.setTokens(session.access_token, session.refresh_token);
        tokenStorage.setCachedUser(profile);
        Storage.setCurrentUser(profile);
        setUser(profile);
        setIsAuthenticated(true);
      } else if (event === 'SIGNED_OUT') {
        Storage.clearAllUserData();
        tokenStorage.clearTokens();
        setUser(EMPTY_USER);
        setIsAuthenticated(false);
      }
    });

    const handleExternalLogout = () => {
      Storage.clearAllUserData();
      tokenStorage.clearTokens();
      setUser(EMPTY_USER);
      setIsAuthenticated(false);
    };

    window.addEventListener('provalix:auth:logout', handleExternalLogout);
    return () => {
      authListener?.subscription?.unsubscribe();
      window.removeEventListener('provalix:auth:logout', handleExternalLogout);
    };
  }, []);

  /**
   * Email or Permanent User ID Login
   */
  const login = async (identifier: string, password: string): Promise<User> => {
    const cleanId = identifier.trim();
    let emailToAuth = cleanId;

    // Check if user entered a Permanent User ID (e.g. PRV-10482)
    const isPermanentId = /^PRV-\d+$/i.test(cleanId) || !cleanId.includes('@');
    if (isPermanentId) {
      const resolvedEmail = await supabaseDataService.getEmailByPermanentId(cleanId);
      if (!resolvedEmail) {
        throw new Error('Invalid email/User ID or password.');
      }
      emailToAuth = resolvedEmail;
    }

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
        throw new Error('Invalid email/User ID or password.');
      }
      throw new Error(error.message || 'Unable to sign in. Please check your credentials.');
    }

    if (!data.session?.user) {
      throw new Error('No active session returned after sign in.');
    }

    let profile = await supabaseDataService.fetchUserProfile(data.session.user.id);
    if (!profile) {
      profile = await supabaseDataService.syncUserProfile(data.session.user);
    }

    tokenStorage.setTokens(data.session.access_token, data.session.refresh_token);
    tokenStorage.setCachedUser(profile);
    Storage.setCurrentUser(profile);
    setUser(profile);
    setIsAuthenticated(true);
    return profile;
  };

  /**
   * New Email & Password Registration without email verification requirement.
   * Creates Supabase user, establishes session, syncs profile, and redirects to dashboard.
   */
  const register = async (
    name: string,
    email: string,
    password: string,
    extra?: RegisterExtra
  ): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Duplicate check: One email = one account
    const emailExists = await supabaseDataService.checkEmailExists(cleanEmail);
    if (emailExists) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    // 2. Auto-generate unique Permanent User ID
    const permanentId =
      extra?.permanent_user_id ||
      extra?.permanentId ||
      (await supabaseDataService.generateUniquePermanentId());
    const profileImg = extra?.profile_image || extra?.avatarUrl || null;

    // 3. Create Supabase Auth user with profile metadata
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: name.trim(),
          department: extra?.department || 'Computer Science & Engineering',
          year: extra?.year || '1st Year',
          college: extra?.college || 'Apex Institute of Technology & Research',
          profile_image: profileImg,
          permanent_user_id: permanentId,
          permanent_id: permanentId,
          avatar_url: profileImg,
          role: 'Student',
        },
      },
    });

    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (
        msg.includes('already registered') ||
        msg.includes('user already exists') ||
        msg.includes('unique constraint') ||
        error.status === 422
      ) {
        throw new Error('An account with this email already exists. Please sign in.');
      }
      throw new Error(error.message || 'Registration failed. Please check your details and try again.');
    }

    let activeSession = data.session;
    let authUser = data.user;

    // If session was not returned immediately, sign in immediately with credentials
    if (!activeSession) {
      const loginRes = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginRes.data.session) {
        activeSession = loginRes.data.session;
        authUser = loginRes.data.user;
      }
    }

    // 4. Create/sync user profile in public.profiles table
    let profile: User;
    if (authUser) {
      profile = await supabaseDataService.syncUserProfile({
        ...authUser,
        user_metadata: {
          full_name: name.trim(),
          department: extra?.department || 'Computer Science & Engineering',
          year: extra?.year || '1st Year',
          college: extra?.college || 'Apex Institute of Technology & Research',
          permanent_id: permanentId,
          permanent_user_id: permanentId,
          avatar_url: profileImg,
        },
      });
    } else {
      profile = {
        id: '',
        name: name.trim(),
        email: cleanEmail,
        permanentId,
        department: extra?.department || 'Computer Science & Engineering',
        year: extra?.year || '1st Year',
        college: extra?.college || 'Apex Institute of Technology & Research',
        role: 'Student',
      };
    }

    // 5. Store session and set authenticated user state
    if (activeSession) {
      tokenStorage.setTokens(activeSession.access_token, activeSession.refresh_token);
    }
    tokenStorage.setCachedUser(profile);
    Storage.setCurrentUser(profile);
    setUser(profile);
    setIsAuthenticated(true);

    return profile;
  };

  const setAuthenticatedUser = (profile: User) => {
    setUser(profile);
    setIsAuthenticated(true);
    tokenStorage.setCachedUser(profile);
    Storage.setCurrentUser(profile);
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (user.id) {
      try {
        const updated = await supabaseDataService.updateUserProfile(user.id, updates);
        setUser(updated);
        tokenStorage.setCachedUser(updated);
        Storage.setCurrentUser(updated);
        return;
      } catch (err) {
        console.warn('[AuthContext] Supabase profile update notice:', err);
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
      await supabase.auth.signOut().catch(() => {});
      await authService.logout().catch(() => {});
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
        register,
        updateProfile,
        uploadPhoto,
        logout,
        setAuthenticatedUser,
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

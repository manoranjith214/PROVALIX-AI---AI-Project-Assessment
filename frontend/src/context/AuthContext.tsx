import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/api/tokenStorage';
import { initializeStorage, Storage } from '../services/storage';
import { supabase, getOAuthRedirectUrl } from '../lib/supabase';

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
      const accessToken = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();
      const cached = tokenStorage.getCachedUser();

      if (accessToken) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          setIsAuthenticated(true);
        } catch {
          // Check if Supabase session is still active
          try {
            const { data } = await supabase.auth.getSession();
            if (data?.session && cached) {
              setUser(cached);
              setIsAuthenticated(true);
              setIsLoading(false);
              return;
            }
          } catch {
            // ignore
          }

          // Token might be expired; attempt refresh if refresh token is present
          if (refreshToken) {
            try {
              await authService.refreshToken();
              const profile = await authService.getCurrentUser();
              setUser(profile);
              setIsAuthenticated(true);
            } catch {
              Storage.clearAllUserData();
              tokenStorage.clearTokens();
              setUser(EMPTY_USER);
              setIsAuthenticated(false);
            }
          } else {
            Storage.clearAllUserData();
            tokenStorage.clearTokens();
            setUser(EMPTY_USER);
            setIsAuthenticated(false);
          }
        }
      } else {
        // Check if Supabase client already has an active persisted session (e.g. PKCE restore)
        try {
          const { data } = await supabase.auth.getSession();
          if (data?.session?.access_token) {
            const sbUser = data.session.user;
            const restoredUser: User = cached || {
              id: sbUser.id,
              name:
                (sbUser.user_metadata?.full_name as string) ||
                (sbUser.user_metadata?.name as string) ||
                sbUser.email?.split('@')[0] ||
                'User',
              email: sbUser.email || '',
              permanentId: `PRV-${sbUser.id.slice(0, 5)}`,
              department: 'Computer Science & Engineering',
              year: '1st Year',
              college: 'Apex Institute of Technology & Research',
              avatar:
                (sbUser.user_metadata?.avatar_url as string) ||
                (sbUser.user_metadata?.picture as string),
              profileImage:
                (sbUser.user_metadata?.avatar_url as string) ||
                (sbUser.user_metadata?.picture as string),
              role: 'Student',
              authProvider: 'google',
            };
            tokenStorage.setTokens(data.session.access_token, data.session.refresh_token);
            tokenStorage.setCachedUser(restoredUser);
            Storage.setCurrentUser(restoredUser);
            setUser(restoredUser);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch {
          // ignore
        }

        setUser(EMPTY_USER);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
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
    let syncedUser: User;
    try {
      const res = await authService.supabaseLogin(accessToken);
      syncedUser = res.user;
    } catch (err: any) {
      console.warn(
        '[AuthContext] Backend /auth/supabase unreachable or failed. Falling back to Supabase session sync:',
        err?.message || err
      );

      const email = supabaseUser?.email || '';
      const name =
        supabaseUser?.user_metadata?.full_name ||
        supabaseUser?.user_metadata?.name ||
        (email ? email.split('@')[0] : 'User');
      const avatar =
        supabaseUser?.user_metadata?.avatar_url ||
        supabaseUser?.user_metadata?.picture ||
        undefined;

      const cached = tokenStorage.getCachedUser();
      const fallbackUser: User = {
        id: supabaseUser?.id || cached?.id || 'usr_oauth',
        name: name || cached?.name || 'User',
        email: email || cached?.email || '',
        permanentId: cached?.permanentId || `PRV-${(supabaseUser?.id || '10000').slice(0, 5)}`,
        department: cached?.department || 'Computer Science & Engineering',
        year: cached?.year || '1st Year',
        college: cached?.college || 'Apex Institute of Technology & Research',
        avatar: avatar || cached?.avatar,
        profileImage: avatar || cached?.profileImage,
        role: cached?.role || 'Student',
        authProvider: 'google',
        createdAt: cached?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      tokenStorage.setTokens(accessToken);
      tokenStorage.setCachedUser(fallbackUser);
      Storage.setCurrentUser(fallbackUser);
      syncedUser = fallbackUser;
    }

    setUser(syncedUser);
    setIsAuthenticated(true);
    return syncedUser;
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
    const updated = await authService.updateProfile(updates);
    setUser(updated);
  };

  const uploadPhoto = async (file: File): Promise<User> => {
    const updated = await authService.uploadAvatar(file);
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

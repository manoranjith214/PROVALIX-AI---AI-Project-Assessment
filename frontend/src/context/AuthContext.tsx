import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/api/tokenStorage';
import { initializeStorage, Storage } from '../services/storage';
import { supabase } from '../lib/supabase';

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
  handleOAuthCallback: (accessToken: string) => Promise<User>;
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

      if (accessToken) {
        try {
          const profile = await authService.getCurrentUser();
          setUser(profile);
          setIsAuthenticated(true);
        } catch {
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
    const redirectTo = `${window.location.origin}/auth/callback`;
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

  const handleOAuthCallback = async (accessToken: string): Promise<User> => {
    const res = await authService.supabaseLogin(accessToken);
    setUser(res.user);
    setIsAuthenticated(true);
    return res.user;
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

import { User } from '../../types';

const TOKEN_KEYS = {
  ACCESS_TOKEN: 'provalix_access_token',
  REFRESH_TOKEN: 'provalix_refresh_token',
  USER: 'provalix_auth_user',
};

export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  },

  setAccessToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, token);
    } catch (err) {
      console.error('Failed to save access token:', err);
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  },

  setRefreshToken(token: string): void {
    try {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN, token);
    } catch (err) {
      console.error('Failed to save refresh token:', err);
    }
  },

  setTokens(accessToken: string, refreshToken?: string): void {
    this.setAccessToken(accessToken);
    if (refreshToken) {
      this.setRefreshToken(refreshToken);
    }
  },

  clearTokens(): void {
    try {
      localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(TOKEN_KEYS.USER);
    } catch (err) {
      console.error('Failed to clear tokens:', err);
    }
  },

  getCachedUser(): User | null {
    try {
      const data = localStorage.getItem(TOKEN_KEYS.USER);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setCachedUser(user: User): void {
    try {
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
    } catch (err) {
      console.error('Failed to cache user profile:', err);
    }
  },
};

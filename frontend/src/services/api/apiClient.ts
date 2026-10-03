import { tokenStorage } from './tokenStorage';
import { supabase } from '../../lib/supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ApiError extends Error {
  status: number;
  errors?: any[];
  data?: any;

  constructor(message: string, status: number, errors?: any[], data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.data = data;
  }
}

const rawApiUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').trim().replace(/\/+$/, '');
const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

export interface RequestOptions extends RequestInit {
  rawEnvelope?: boolean;
}

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
let pendingRefreshPromise: Promise<string | null> | null = null;

export function invalidateTokenCache() {
  cachedAccessToken = null;
}

async function getOrRefreshAccessToken(): Promise<string | null> {
  const now = Date.now();
  // If we have a cached token valid for at least 30 more seconds, return immediately
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 30000) {
    return cachedAccessToken.token;
  }

  // Deduplicate concurrent session refresh attempts
  if (pendingRefreshPromise) {
    return pendingRefreshPromise;
  }

  pendingRefreshPromise = (async () => {
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        try {
          const { data: refreshed } = await supabase.auth.refreshSession();
          if (refreshed?.session) {
            session = refreshed.session;
          }
        } catch {
          // ignore refresh error
        }
      }

      if (session?.access_token) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 3600000;
        cachedAccessToken = { token: session.access_token, expiresAt };
        tokenStorage.setAccessToken(session.access_token);
        return session.access_token;
      }

      const localToken = tokenStorage.getAccessToken();
      if (localToken) {
        cachedAccessToken = { token: localToken, expiresAt: Date.now() + 60000 };
        return localToken;
      }
      return null;
    } catch {
      return tokenStorage.getAccessToken();
    } finally {
      pendingRefreshPromise = null;
    }
  })();

  return pendingRefreshPromise;
}

export async function request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (!headers['Authorization']) {
    const token = await getOrRefreshAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch (networkErr: any) {
    throw new ApiError(
      networkErr.message || 'Unable to connect to Provalix AI server. Please check your network connection.',
      0
    );
  }

  // Handle 401 Unauthorized: parse error message without clearing Supabase session or forcing global logout
  if (response.status === 401) {
    let errorMsg = 'Authentication required. Please sign in again.';
    try {
      const errorJson = await response.json();
      if (errorJson?.message) {
        errorMsg = errorJson.message;
      }
    } catch {
      // ignore JSON parse error
    }
    throw new ApiError(errorMsg, 401);
  }

  // Parse JSON response
  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(`HTTP Error ${response.status}: ${response.statusText}`, response.status);
    }
    return {} as T;
  }

  if (!response.ok || json.success === false) {
    const errorMsg = json.message || (json.errors && json.errors[0]?.message) || `Request failed (${response.status})`;
    throw new ApiError(errorMsg, response.status, json.errors, json.data);
  }

  if (options.rawEnvelope) {
    return json as unknown as T;
  }

  return json.data as T;
}

export const apiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  request<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, options);
  },

  get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  getWithMeta<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<ApiResponse<T>>(endpoint, { ...options, method: 'GET', rawEnvelope: true });
  },

  post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

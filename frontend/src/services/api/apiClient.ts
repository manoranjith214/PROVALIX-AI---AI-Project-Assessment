import { tokenStorage } from './tokenStorage';

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  endpoint: string;
  options?: RequestInit;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(apiClient.request(prom.endpoint, prom.options));
    }
  });
  failedQueue = [];
};

export const apiClient = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  async request<T = any>(endpoint: string, options: RequestInit & { rawEnvelope?: boolean } = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    const token = tokenStorage.getAccessToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
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

    // Handle 401 Unauthorized: throw ApiError without clearing Supabase session or forcing global logout
    if (response.status === 401) {
      throw new ApiError('Authentication required or endpoint unauthorized.', 401);
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
  },

  get<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  getWithMeta<T = any>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(endpoint, { ...options, method: 'GET', rawEnvelope: true });
  },

  post<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  put<T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    });
  },

  delete<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

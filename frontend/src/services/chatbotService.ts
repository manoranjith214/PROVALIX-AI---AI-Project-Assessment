import { apiClient } from './api/apiClient';
import { supabase } from '../lib/supabase';
import { tokenStorage } from './api/tokenStorage';

export interface ChatSource {
  title: string;
  category?: string;
  id?: string;
  type?: string;
}

export interface ChatMessagePayload {
  message: string;
  conversationId?: string;
  projectId?: string;
  submissionId?: string;
  context?: {
    projectId?: string;
    classroomId?: string;
    submissionId?: string;
  };
  isRetry?: boolean;
}

export interface ChatMessageResponse {
  conversationId: string;
  message: string;
  sources: ChatSource[];
  contextUsed: {
    hasProjectContext: boolean;
    hasKnowledgeBaseContext: boolean;
    projectTitle?: string;
    detectedLanguage?: string;
    detectedIntent?: string;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  projectId?: string;
  submissionId?: string;
  messages?: Array<{
    id: string;
    role: 'user' | 'assistant';
    message: string;
    sources?: ChatSource[];
    createdAt: string;
  }>;
}

async function getAuthToken(): Promise<string | null> {
  try {
    let { data: { session } } = await supabase.auth.getSession();
    if (session && session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
      try {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session) {
          session = refreshed.session;
        }
      } catch {
        // use existing session if refresh fails
      }
    }
    if (session?.access_token) return session.access_token;
  } catch {}
  return tokenStorage.getAccessToken();
}

export const chatbotService = {
  async sendMessage(payload: ChatMessagePayload): Promise<ChatMessageResponse> {
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Authentication required. Please sign in again.');
    }

    const body: Record<string, any> = {
      message: payload.message,
      conversationId: payload.conversationId,
    };

    if (payload.projectId || payload.submissionId || payload.context) {
      body.projectId = payload.projectId || payload.context?.projectId;
      body.submissionId = payload.submissionId || payload.context?.submissionId || payload.context?.classroomId;
      body.context = {
        projectId: body.projectId,
        classroomId: body.submissionId,
      };
    }

    return apiClient.post<ChatMessageResponse>('/chatbot/message', body, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getConversations(): Promise<ConversationSummary[]> {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const data = await apiClient.get<ConversationSummary[]>('/chatbot/conversations', { headers });
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getConversationById(id: string): Promise<ConversationSummary | null> {
    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      return await apiClient.get<ConversationSummary>(`/chatbot/conversations/${id}`, { headers });
    } catch {
      return null;
    }
  },

  async deleteConversation(id: string): Promise<void> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    await apiClient.delete(`/chatbot/conversations/${id}`, { headers });
  },
};

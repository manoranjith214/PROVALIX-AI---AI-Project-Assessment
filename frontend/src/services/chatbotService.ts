import { apiClient } from './api/apiClient';

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
}

export interface ChatMessageResponse {
  conversationId: string;
  message: string;
  sources: ChatSource[];
  contextUsed: {
    hasProjectContext: boolean;
    hasKnowledgeBaseContext: boolean;
    projectTitle?: string;
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

export const chatbotService = {
  async sendMessage(payload: ChatMessagePayload): Promise<ChatMessageResponse> {
    return apiClient.post<ChatMessageResponse>('/chatbot/message', payload);
  },

  async getConversations(): Promise<ConversationSummary[]> {
    try {
      const data = await apiClient.get<ConversationSummary[]>('/chatbot/conversations');
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async getConversationById(id: string): Promise<ConversationSummary | null> {
    try {
      return await apiClient.get<ConversationSummary>(`/chatbot/conversations/${id}`);
    } catch {
      return null;
    }
  },

  async deleteConversation(id: string): Promise<void> {
    await apiClient.delete(`/chatbot/conversations/${id}`);
  }
};


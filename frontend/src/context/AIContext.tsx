import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatbotService, ConversationSummary, ChatSource } from '../services/chatbotService';
import { useAuth } from './AuthContext';

export interface AIMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  sources?: ChatSource[];
  contextUsed?: {
    hasProjectContext: boolean;
    hasKnowledgeBaseContext: boolean;
    projectTitle?: string;
  };
}

export interface AIContextValue {
  isOpen: boolean;
  openAssistant: () => void;
  closeAssistant: () => void;
  toggleAssistant: () => void;
  messages: AIMessage[];
  sendMessage: (text: string) => Promise<void>;
  retryLastMessage: () => Promise<void>;
  suggestedQuestions: string[];
  setContextCategory: (category: string) => void;
  conversationId: string | null;
  startNewConversation: () => void;
  clearCurrentConversation: () => void;
  conversations: ConversationSummary[];
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  setProjectContext: (projectId?: string, submissionId?: string) => void;
  activeProjectId?: string;
  activeSubmissionId?: string;
  isLoading: boolean;
  error: string | null;
  loadHistory: () => Promise<void>;
}

const AIContext = createContext<AIContextValue | undefined>(undefined);

const CONTEXT_SUGGESTIONS: Record<string, { questions: string[]; defaultResponse: string; requiresProject?: boolean }> = {
  dashboard: {
    questions: [
      'Explain my current evaluation status',
      'What deadlines are coming?',
      'What is my team?',
    ],
    defaultResponse: 'From the Dashboard, you can track your current evaluations across classrooms, review deadlines, and monitor your submissions.'
  },
  projectChecker: {
    questions: [
      'Explain my score',
      'Explain plagiarism result',
      'What should I improve?',
    ],
    defaultResponse: 'The Project Checker evaluates your submission out of 100 marks across 7 criteria: Problem Definition, Innovation, Technical Implementation, Functionality, Code Quality, Documentation, and Overall Quality.',
    requiresProject: true,
  },
  projectReport: {
    questions: [
      'Explain my report',
      'Explain my score',
      'Give improvement recommendations',
    ],
    defaultResponse: 'Based on evaluation guidelines, review your key architectural areas and unit test coverage to prioritize actionable improvements.',
    requiresProject: true,
  },
  teams: {
    questions: [
      'What is my team?',
      'Who is my team captain?',
      'Who are my team members?',
    ],
    defaultResponse: 'Teams allow collaborative project submissions with assigned team captains and members.'
  },
  classroom: {
    questions: [
      'Explain my evaluation',
      'What is pending?',
      'When is my deadline?',
    ],
    defaultResponse: 'Classroom evaluation combines AI Evaluation (/50), PPT & Demo (/25), and Viva Assessment (/25) for a final score out of 100.'
  },
  viva: {
    questions: [
      'Start viva practice',
      'Ask technical questions',
      'Explain my weak areas',
    ],
    defaultResponse: 'Viva defense assesses your problem understanding, architecture, algorithms, and failover design across 5 standardized question categories.',
    requiresProject: true,
  },
  evaluation: {
    questions: [
      'Explain my score',
      'What should I improve?',
      'Why is my evaluation incomplete?',
    ],
    defaultResponse: 'Evaluations combine multi-criteria AI rubric scoring with faculty defense review.',
    requiresProject: true,
  },
  leaderboard: {
    questions: [
      "What's my rank?",
      'Is my result published?',
      'Explain leaderboard ranking',
    ],
    defaultResponse: 'The leaderboard reflects finalized scores published after classroom verification.'
  },
  notifications: {
    questions: [
      'Do I have any pending notifications?',
      'Why did I receive this notification?',
      'What deadlines are coming?',
    ],
    defaultResponse: 'Notifications alert you to approaching deadlines, published results, and faculty evaluation reviews.'
  },
  noProjectFallback: {
    questions: [
      'Explain my current evaluation status',
      'What deadlines are coming?',
      'Start viva practice',
    ],
    defaultResponse: 'I am your Provalix AI Assistant. You can ask technical, academic, platform, programming, or project questions in English, Tamil, Tanglish, or Hindi.'
  }
};

const INITIAL_WELCOME_MSG: AIMessage = {
  id: 'msg_welcome',
  sender: 'ai',
  text: 'Hello! I am your Provalix AI Assistant. How can I help you with your project evaluations, coding, or platform guidelines today?',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('dashboard');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | undefined>();
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([INITIAL_WELCOME_MSG]);
  const [lastUserPrompt, setLastUserPrompt] = useState<string>('');

  const openAssistant = () => setIsOpen(true);
  const closeAssistant = () => setIsOpen(false);
  const toggleAssistant = () => setIsOpen(prev => !prev);

  const setContextCategory = (category: string) => {
    if (CONTEXT_SUGGESTIONS[category]) {
      setCurrentCategory(category);
    }
  };

  const setProjectContext = (projectId?: string, submissionId?: string) => {
    setActiveProjectId(projectId);
    setActiveSubmissionId(submissionId);
  };

  const loadHistory = useCallback(async () => {
    try {
      const list = await chatbotService.getConversations();
      setConversations(list);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      setConversationId(null);
      setConversations([]);
      setMessages([INITIAL_WELCOME_MSG]);
      setActiveProjectId(undefined);
      setActiveSubmissionId(undefined);
      setError(null);
      setLastUserPrompt('');
    }
  }, [isAuthenticated]);

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([INITIAL_WELCOME_MSG]);
    setError(null);
    setLastUserPrompt('');
  };

  const clearCurrentConversation = () => {
    setMessages([INITIAL_WELCOME_MSG]);
    setError(null);
  };

  const loadConversation = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const conv = await chatbotService.getConversationById(id);
      if (conv) {
        setConversationId(conv.id);
        if (conv.messages && conv.messages.length > 0) {
          const mapped: AIMessage[] = conv.messages.map(m => ({
            id: m.id,
            sender: m.role === 'user' ? 'user' : 'ai',
            text: m.message,
            timestamp: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: m.sources,
          }));
          setMessages(mapped);
        } else {
          setMessages([INITIAL_WELCOME_MSG]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await chatbotService.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) {
        startNewConversation();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete conversation');
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setError(null);
    setLastUserPrompt(text);

    const userMsg: AIMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await chatbotService.sendMessage({
        message: text,
        conversationId: conversationId || undefined,
        projectId: activeProjectId,
        submissionId: activeSubmissionId,
      });

      if (res.conversationId) {
        setConversationId(res.conversationId);
      }

      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: res.message,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: res.sources,
        contextUsed: res.contextUsed,
      };

      setMessages(prev => [...prev, aiMsg]);
      loadHistory();
    } catch (err: any) {
      console.warn('AI assistant call failed:', err);
      const config = CONTEXT_SUGGESTIONS[currentCategory] || CONTEXT_SUGGESTIONS.dashboard;
      let fallbackText = config?.defaultResponse || "I've analyzed your question based on evaluation rubrics.";
      if (err.message) {
        setError(err.message);
      }
      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const retryLastMessage = async () => {
    if (lastUserPrompt && !isLoading) {
      await sendMessage(lastUserPrompt);
    }
  };

  // Determine suggestions: omit project-specific suggestions when no project exists
  const hasProject = Boolean(activeProjectId || activeSubmissionId);
  const currentConfig = CONTEXT_SUGGESTIONS[currentCategory] || CONTEXT_SUGGESTIONS.dashboard;
  const suggestedQuestions =
    currentConfig.requiresProject && !hasProject
      ? CONTEXT_SUGGESTIONS.noProjectFallback.questions
      : currentConfig.questions;

  return (
    <AIContext.Provider
      value={{
        isOpen,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        messages,
        sendMessage,
        retryLastMessage,
        suggestedQuestions,
        setContextCategory,
        conversationId,
        startNewConversation,
        clearCurrentConversation,
        conversations,
        loadConversation,
        deleteConversation,
        setProjectContext,
        activeProjectId,
        activeSubmissionId,
        isLoading,
        error,
        loadHistory,
      }}
    >
      {children}
    </AIContext.Provider>
  );
};

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
};

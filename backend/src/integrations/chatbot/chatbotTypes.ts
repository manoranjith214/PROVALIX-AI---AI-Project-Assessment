export type ChatRole = 'user' | 'assistant' | 'system';

export type QueryCategory =
  | 'PROJECT'
  | 'PROVALIX_PLATFORM'
  | 'EVALUATION'
  | 'PROJECT_REPORT'
  | 'CLASSROOM'
  | 'TEAM'
  | 'DEADLINE'
  | 'VIVA'
  | 'PLAGIARISM'
  | 'RANKING'
  | 'NOTIFICATION'
  | 'TECHNICAL'
  | 'PROGRAMMING'
  | 'DATABASE'
  | 'AI_ML'
  | 'ACADEMIC'
  | 'CAREER'
  | 'GENERAL'
  | 'CASUAL_CONVERSATION';

export type SupportedLanguage =
  | 'english'
  | 'tamil'
  | 'tanglish'
  | 'hindi'
  | 'telugu'
  | 'malayalam'
  | 'kannada'
  | 'bengali'
  | 'marathi';

export interface ChatSourceReference {
  title: string;
  category: string;
  id?: string;
  source?: string;
}

export interface SendMessageDto {
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

export type PrimaryIntent =
  | 'PROVALIX'
  | 'PROJECT'
  | 'PROGRAMMING'
  | 'ACADEMIC'
  | 'GENERAL'
  | 'FOLLOW_UP';

export interface ChatResponseData {
  conversationId: string;
  message: string;
  sources: ChatSourceReference[];
  contextUsed: {
    hasProjectContext: boolean;
    hasKnowledgeBaseContext: boolean;
    projectTitle?: string;
    detectedLanguage?: SupportedLanguage;
    detectedIntent?: PrimaryIntent;
    categories?: QueryCategory[];
  };
}


import { chatbotRepository } from './ChatbotRepository';
import { contextService } from './ContextService';
import { knowledgeBaseService } from '../knowledge-base/KnowledgeBaseService';
import { aiService } from '../../services/aiService';
import { queryClassifier } from './QueryClassifier';
import { SendMessageDto, ChatResponseData, ChatSourceReference } from './chatbotTypes';
import { AppError } from '../../middleware/errorMiddleware';

export class ChatbotService {
  /**
   * Processes an incoming chat message through the RAG pipeline
   */
  async processMessage(userId: string, dto: SendMessageDto): Promise<ChatResponseData> {
    const rawMessage = (dto.message || '').trim();

    if (!rawMessage || rawMessage.length === 0) {
      throw new AppError('Message content cannot be empty', 400);
    }

    // Basic prompt injection / guardrail sanitization
    const sanitizedMessage = this.sanitizeInput(rawMessage);

    const inputProjectId = dto.projectId || dto.context?.projectId;
    const inputSubmissionId = dto.submissionId || dto.context?.submissionId || dto.context?.classroomId;

    // 1. Resolve or Create Conversation with retry protection
    let conversation: any;
    let isMessageAlreadyInDb = false;

    if (dto.conversationId) {
      conversation = await chatbotRepository.findConversationById(dto.conversationId);
      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }
      if (conversation.userId !== userId) {
        throw new AppError('Unauthorized access to this conversation', 403);
      }
      const existingMsgs = conversation.messages || [];
      if (existingMsgs.length > 0) {
        const lastMsg = existingMsgs[existingMsgs.length - 1];
        if (lastMsg.role === 'user' && lastMsg.message === sanitizedMessage) {
          isMessageAlreadyInDb = true;
        }
      }
    } else {
      // Check if this is a retry of a recent pending question before creating an orphaned duplicate conversation
      const pendingConv = await chatbotRepository.findRecentPendingUserConversation(userId, sanitizedMessage);
      if (pendingConv) {
        conversation = pendingConv;
        isMessageAlreadyInDb = true;
      } else {
        const title = sanitizedMessage.slice(0, 40) + (sanitizedMessage.length > 40 ? '...' : '');
        conversation = await chatbotRepository.createConversation(
          userId,
          title,
          inputProjectId,
          inputSubmissionId
        );
      }
    }

    // 2. Extract recent conversation history for intent classification
    const rawMessages = conversation.messages || [];
    const recentHistory = rawMessages.slice(-5).map((m: any) => ({
      role: m.role,
      message: m.message,
    }));

    // 3. Classify user intent, language, and context requirements
    const classification = queryClassifier.classify(
      sanitizedMessage,
      inputProjectId,
      inputSubmissionId,
      recentHistory
    );

    const projectId = inputProjectId || conversation.projectId;
    const submissionId = inputSubmissionId || conversation.submissionId;

    let projectContext: any = null;
    let kbResult: any = { sources: [], contextText: '' };
    const sources: ChatSourceReference[] = [];
    const contextSections: string[] = [];

    // 4. Selective Context Retrieval
    // Project context is ONLY injected when the question is actually project-related
    if (!classification.isCasualGreeting) {
      // A. Specific User Context based on detected intent
      if (classification.userContextType === 'deadline') {
        const dRes = await contextService.getUserDeadlinesContext(userId);
        if (dRes.sourceReference) sources.push(dRes.sourceReference);
        contextSections.push(`[Authorized Upcoming Deadlines]\n${dRes.contextString}`);
      } else if (classification.userContextType === 'team') {
        const tRes = await contextService.getUserTeamsContext(userId);
        if (tRes.sourceReference) sources.push(tRes.sourceReference);
        contextSections.push(`[Authorized Team Information]\n${tRes.contextString}`);
      } else if (classification.userContextType === 'classroom') {
        const cRes = await contextService.getUserClassroomsContext(userId);
        if (cRes.sourceReference) sources.push(cRes.sourceReference);
        contextSections.push(`[Authorized Enrolled Classrooms]\n${cRes.contextString}`);
      } else if (classification.userContextType === 'ranking') {
        const rRes = await contextService.getUserRankingContext(userId);
        if (rRes.sourceReference) sources.push(rRes.sourceReference);
        contextSections.push(`[Authorized Classroom Ranking]\n${rRes.contextString}`);
      } else if (classification.userContextType === 'notification') {
        const nRes = await contextService.getUserNotificationsContext(userId);
        if (nRes.sourceReference) sources.push(nRes.sourceReference);
        contextSections.push(`[Authorized Recent Notifications]\n${nRes.contextString}`);
      } else if (classification.requiresProjectContext) {
        // Only query project context if the question is actually PROJECT related
        if (projectId || submissionId) {
          projectContext = await contextService.getAuthorizedProjectContext(
            userId,
            projectId,
            submissionId
          );
          if (projectContext) {
            sources.push(projectContext.sourceReference);
            contextSections.push(`[Authorized Project Evaluation Evidence]\n${projectContext.contextString}`);
          } else {
            contextSections.push(`[Authorized Project Evaluation Evidence]\nNo project evidence found.`);
          }
        } else {
          const evalRes = await contextService.getUserEvaluationContext(userId);
          if (evalRes.sourceReference && evalRes.hasData) {
            sources.push(evalRes.sourceReference);
          }
          contextSections.push(`[Authorized Project Evaluation Evidence]\n${evalRes.contextString}`);
        }
      }

      // B. Query Knowledge Base for Provalix Platform, Rubrics, or relevant technical guidelines
      if (
        classification.requiresProvalixKB ||
        classification.categories.includes('PROVALIX_PLATFORM')
      ) {
        kbResult = await knowledgeBaseService.retrieveContext(sanitizedMessage, { limit: 3 });

        if (kbResult.sources && kbResult.sources.length > 0) {
          for (const s of kbResult.sources) {
            sources.push({
              title: s.title,
              category: s.category,
              id: s.id,
            });
          }
        }

        if (kbResult.contextText && kbResult.contextText !== 'No specific knowledge base documents matched the query.') {
          contextSections.push(`[Provalix Platform Guidelines & Rubric]\n${kbResult.contextText}`);
        }
      }
    }

    const fullContext = contextSections.join('\n\n---\n\n');

    // 5. Bounded Relevant Conversation History (Max 5 relevant messages)
    // If the user changes topic or asks a standalone question, discard irrelevant previous context.
    const relevantHistory = this.filterRelevantHistory(
      classification.detectedIntent,
      classification.isFollowUp,
      recentHistory
    );

    // Save User message in DB if not already saved (prevents duplicate DB records on retry)
    if (!isMessageAlreadyInDb) {
      await chatbotRepository.addMessage(conversation.id, 'user', sanitizedMessage);
    }

    // 6. Invoke AI Provider through AIService abstraction
    const aiResponseText = await aiService.generateChatResponse({
      userId,
      userMessage: sanitizedMessage,
      context: fullContext,
      conversationHistory: relevantHistory,
      detectedLanguage: classification.detectedLanguage,
      detectedIntent: classification.detectedIntent,
    });

    // 7. Console logging during development (Requirement 20 - No credentials or auth tokens logged)
    console.log('CHAT QUESTION:', sanitizedMessage);
    console.log('DETECTED INTENT:', classification.detectedIntent);
    console.log('CONTEXT USED:', fullContext ? (fullContext.length > 250 ? fullContext.slice(0, 250) + '... [truncated]' : fullContext) : 'None');
    console.log('AI RESPONSE:', (aiResponseText.length > 250 ? aiResponseText.slice(0, 250) + '... [truncated]' : aiResponseText));

    // 8. Persist Assistant Response with genuine sources
    await chatbotRepository.addMessage(conversation.id, 'assistant', aiResponseText, sources);

    return {
      conversationId: conversation.id,
      message: aiResponseText,
      sources,
      contextUsed: {
        hasProjectContext: Boolean(projectContext) || classification.requiresProjectContext,
        hasKnowledgeBaseContext: sources.some((s) => s.category !== 'User Project Evaluation' && s.category !== 'Classroom Evaluation'),
        projectTitle: projectContext?.projectTitle,
        detectedLanguage: classification.detectedLanguage,
        detectedIntent: classification.detectedIntent,
        categories: classification.categories,
      },
    };
  }

  /**
   * Filters and bounds conversation history to only relevant messages (max 5 messages).
   * Discards irrelevant prior messages when a new standalone topic is started.
   */
  private filterRelevantHistory(
    currentIntent: string,
    isFollowUp: boolean,
    history: Array<{ role: string; message: string }>
  ): Array<{ role: string; message: string }> {
    if (!history || history.length === 0) {
      return [];
    }

    // Only retain previous context if the current query is an explicit follow-up
    if (isFollowUp) {
      return history.slice(-5);
    }

    // For new standalone questions, discard previous irrelevant context so answers are not repeated
    return [];
  }



  async getUserConversations(userId: string) {
    return chatbotRepository.listUserConversations(userId);
  }

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await chatbotRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }
    if (conversation.userId !== userId) {
      throw new AppError('Unauthorized access to this conversation', 403);
    }

    return {
      id: conversation.id,
      title: conversation.title,
      projectId: conversation.projectId,
      submissionId: conversation.submissionId,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        message: m.message,
        sources: m.sources ? JSON.parse(m.sources) : [],
        createdAt: m.createdAt,
      })),
    };
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await chatbotRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new AppError('Conversation not found', 404);
    }
    if (conversation.userId !== userId) {
      throw new AppError('Unauthorized access to this conversation', 403);
    }

    await chatbotRepository.deleteConversation(conversationId);
    return { message: 'Conversation deleted successfully' };
  }

  /**
   * Sanitizes input to prevent prompt injection and oversized payloads
   */
  private sanitizeInput(input: string): string {
    // Truncate excessively long messages (> 2000 chars)
    const trimmed = input.slice(0, 2000);
    // Neutralize common system jailbreak prefixes
    return trimmed
      .replace(/ignore all previous instructions/gi, '[filtered prompt directive]')
      .replace(/you are now in system admin mode/gi, '[filtered prompt directive]');
  }
}

export const chatbotService = new ChatbotService();

import { chatbotRepository } from './ChatbotRepository';
import { contextService } from './ContextService';
import { knowledgeBaseService } from '../knowledge-base/KnowledgeBaseService';
import { defaultAIProvider } from '../ai/MockAIProvider';
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

    // Classify user intent and language
    const classification = queryClassifier.classify(
      sanitizedMessage,
      dto.projectId,
      dto.submissionId
    );

    // 1. Resolve or Create Conversation
    let conversation: any;
    if (dto.conversationId) {
      conversation = await chatbotRepository.findConversationById(dto.conversationId);
      if (!conversation) {
        throw new AppError('Conversation not found', 404);
      }
      if (conversation.userId !== userId) {
        throw new AppError('Unauthorized access to this conversation', 403);
      }
    } else {
      const title = sanitizedMessage.slice(0, 40) + (sanitizedMessage.length > 40 ? '...' : '');
      conversation = await chatbotRepository.createConversation(
        userId,
        title,
        dto.projectId,
        dto.submissionId
      );
    }

    const projectId = dto.projectId || conversation.projectId;
    const submissionId = dto.submissionId || conversation.submissionId;

    let projectContext: any = null;
    let kbResult: any = { sources: [], contextText: '' };
    const sources: ChatSourceReference[] = [];
    const contextSections: string[] = [];

    // 2. Selective Context Retrieval (Zero overhead for casual conversation)
    if (!classification.isCasualGreeting) {
      // A. Specific User Database Context based on classified intent
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
      } else if (
        classification.userContextType === 'evaluation' ||
        classification.userContextType === 'viva' ||
        classification.userContextType === 'plagiarism' ||
        classification.userContextType === 'project_report' ||
        projectId ||
        submissionId ||
        classification.requiresProjectContext
      ) {
        if (projectId || submissionId) {
          projectContext = await contextService.getAuthorizedProjectContext(
            userId,
            projectId,
            submissionId
          );
          if (projectContext) {
            sources.push(projectContext.sourceReference);
            contextSections.push(`[Authorized Project Evaluation]\n${projectContext.contextString}`);
          }
        } else {
          const evalRes = await contextService.getUserEvaluationContext(userId);
          if (evalRes.sourceReference && evalRes.hasData) {
            sources.push(evalRes.sourceReference);
          }
          contextSections.push(`[Authorized Project & Evaluation Status]\n${evalRes.contextString}`);
        }
      }

      // B. Query Knowledge Base for Provalix Platform, Rubrics, or relevant technical guidelines
      if (
        classification.requiresProvalixKB ||
        classification.categories.includes('PROVALIX_PLATFORM') ||
        (classification.categories.includes('PROJECT') && !projectContext)
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

    // 3. Bounded Conversation History (Last 8 messages to prevent unbounded token growth)
    const rawMessages = conversation.messages || [];
    const history = rawMessages.slice(-8).map((m: any) => ({
      role: m.role,
      message: m.message,
    }));

    // Save User message in DB
    await chatbotRepository.addMessage(conversation.id, 'user', sanitizedMessage);

    // 4. Invoke AI Provider with language and classification awareness
    const aiResponseText = await defaultAIProvider.generateResponse(
      sanitizedMessage,
      fullContext,
      history,
      classification.detectedLanguage
    );

    // 5. Persist Assistant Response with genuine sources (No fake sources for general/casual knowledge)
    await chatbotRepository.addMessage(conversation.id, 'assistant', aiResponseText, sources);

    return {
      conversationId: conversation.id,
      message: aiResponseText,
      sources,
      contextUsed: {
        hasProjectContext: Boolean(projectContext),
        hasKnowledgeBaseContext: sources.some((s) => s.category !== 'User Project Evaluation' && s.category !== 'Classroom Evaluation'),
        projectTitle: projectContext?.projectTitle,
        detectedLanguage: classification.detectedLanguage,
        categories: classification.categories,
      },
    };
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

import { Response, NextFunction } from 'express';
import { chatbotService } from '../integrations/chatbot/ChatbotService';
import { sendMessageSchema } from '../validators/chatbotValidator';
import { sendSuccess } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export class ChatbotController {
  async sendMessage(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = sendMessageSchema.parse(req.body);
      const result = await chatbotService.processMessage(req.user!.id, validated);
      return sendSuccess(res, result, 'Chatbot response generated', 200);
    } catch (err) {
      next(err);
    }
  }

  async getConversations(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const list = await chatbotService.getUserConversations(req.user!.id);
      return sendSuccess(res, list, 'User conversations retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async getConversationById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const conversation = await chatbotService.getConversationById(req.params.id, req.user!.id);
      return sendSuccess(res, conversation, 'Conversation details retrieved', 200);
    } catch (err) {
      next(err);
    }
  }

  async deleteConversation(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await chatbotService.deleteConversation(req.params.id, req.user!.id);
      return sendSuccess(res, result, result.message, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const chatbotController = new ChatbotController();

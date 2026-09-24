import { prisma } from '../../config/prisma';

export class ChatbotRepository {
  async createConversation(userId: string, title: string, projectId?: string, submissionId?: string) {
    return prisma.chatConversation.create({
      data: {
        userId,
        title,
        projectId,
        submissionId,
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async findConversationById(id: string) {
    return prisma.chatConversation.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async listUserConversations(userId: string) {
    return prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      },
    });
  }

  async deleteConversation(id: string) {
    return prisma.chatConversation.delete({
      where: { id },
    });
  }

  async addMessage(conversationId: string, role: string, message: string, sources?: any[]) {
    return prisma.$transaction(async (tx) => {
      const chatMsg = await tx.chatMessage.create({
        data: {
          conversationId,
          role,
          message,
          sources: sources ? JSON.stringify(sources) : undefined,
        },
      });

      // Update conversation updatedAt timestamp
      await tx.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return chatMsg;
    }, { maxWait: 15000, timeout: 30000 });
  }
}

export const chatbotRepository = new ChatbotRepository();

import { prisma } from '../../config/prisma';

export class KnowledgeRepository {
  async createDocument(data: {
    title: string;
    category: string;
    content: string;
    source?: string;
    version?: string;
    chunks?: Array<{ chunkIndex: number; content: string; embedding?: string }>;
  }) {
    return prisma.knowledgeDocument.create({
      data: {
        title: data.title,
        category: data.category,
        content: data.content,
        source: data.source,
        version: data.version || '1.0',
        chunks: data.chunks
          ? {
              create: data.chunks.map((c) => ({
                chunkIndex: c.chunkIndex,
                content: c.content,
                embedding: c.embedding,
              })),
            }
          : undefined,
      },
      include: {
        chunks: true,
      },
    });
  }

  async findById(id: string) {
    return prisma.knowledgeDocument.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
  }

  async findByTitle(title: string) {
    return prisma.knowledgeDocument.findFirst({
      where: { title: { equals: title, mode: 'insensitive' } },
      include: { chunks: true },
    });
  }

  async updateDocument(id: string, data: { title?: string; category?: string; content?: string; source?: string }) {
    return prisma.knowledgeDocument.update({
      where: { id },
      data,
      include: { chunks: true },
    });
  }

  async deleteDocument(id: string) {
    return prisma.knowledgeDocument.delete({
      where: { id },
    });
  }

  async listDocuments(category?: string) {
    return prisma.knowledgeDocument.findMany({
      where: category ? { category: { equals: category, mode: 'insensitive' } } : undefined,
      include: { chunks: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async searchChunks(category?: string) {
    return prisma.knowledgeChunk.findMany({
      where: category
        ? {
            document: {
              category: { equals: category, mode: 'insensitive' },
            },
          }
        : undefined,
      include: {
        document: {
          select: {
            id: true,
            title: true,
            category: true,
            source: true,
          },
        },
      },
    });
  }
}

export const knowledgeRepository = new KnowledgeRepository();

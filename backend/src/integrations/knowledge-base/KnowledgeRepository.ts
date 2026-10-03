import { prisma } from '../../config/prisma';

// In-memory cache for static knowledge chunks to eliminate repeated DB queries during AI evaluation
interface ChunkCacheEntry {
  expiresAt: number;
  data: any[];
}
const CHUNK_CACHE = new Map<string, ChunkCacheEntry>();
const CHUNK_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class KnowledgeRepository {
  private invalidateCache() {
    CHUNK_CACHE.clear();
  }

  async createDocument(data: {
    title: string;
    category: string;
    content: string;
    source?: string;
    version?: string;
    chunks?: Array<{ chunkIndex: number; content: string; embedding?: string }>;
  }) {
    this.invalidateCache();
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
    this.invalidateCache();
    return prisma.knowledgeDocument.update({
      where: { id },
      data,
      include: { chunks: true },
    });
  }

  async deleteDocument(id: string) {
    this.invalidateCache();
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
    const cacheKey = category ? category.toLowerCase().trim() : '__ALL__';
    const cached = CHUNK_CACHE.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const data = await prisma.knowledgeChunk.findMany({
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

    CHUNK_CACHE.set(cacheKey, {
      expiresAt: Date.now() + CHUNK_CACHE_TTL_MS,
      data,
    });

    return data;
  }
}

export const knowledgeRepository = new KnowledgeRepository();

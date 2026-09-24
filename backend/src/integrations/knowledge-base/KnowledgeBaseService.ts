import { knowledgeRepository } from './KnowledgeRepository';
import { defaultEmbeddingProvider } from '../embeddings/MockEmbeddingProvider';
import { AppError } from '../../middleware/errorMiddleware';

export interface SearchKnowledgeOptions {
  category?: string;
  limit?: number;
  minRelevance?: number;
}

export interface RelevantKnowledgeItem {
  id: string;
  documentId: string;
  title: string;
  category: string;
  content: string;
  source?: string;
  score: number;
}

export class KnowledgeBaseService {
  /**
   * Adds a knowledge document, creates text chunks, and computes embeddings
   */
  async addDocument(data: {
    title: string;
    category: string;
    content: string;
    source?: string;
    version?: string;
  }) {
    if (!data.title || !data.content || !data.category) {
      throw new AppError('Title, category, and content are required for knowledge document', 400);
    }

    // Split into chunks of ~500 characters with 100 character overlap
    const rawChunks = this.splitIntoChunks(data.content, 500, 100);
    const embeddings = await defaultEmbeddingProvider.generateEmbeddings(rawChunks);

    const chunks = rawChunks.map((chunkContent, idx) => ({
      chunkIndex: idx,
      content: chunkContent,
      embedding: JSON.stringify(embeddings[idx]),
    }));

    return knowledgeRepository.createDocument({
      title: data.title,
      category: data.category,
      content: data.content,
      source: data.source || 'Provalix Knowledge Base',
      version: data.version || '1.0',
      chunks,
    });
  }

  async updateDocument(
    id: string,
    data: { title?: string; category?: string; content?: string; source?: string }
  ) {
    const doc = await knowledgeRepository.findById(id);
    if (!doc) {
      throw new AppError('Knowledge document not found', 404);
    }
    return knowledgeRepository.updateDocument(id, data);
  }

  async deleteDocument(id: string) {
    const doc = await knowledgeRepository.findById(id);
    if (!doc) {
      throw new AppError('Knowledge document not found', 404);
    }
    await knowledgeRepository.deleteDocument(id);
    return { message: 'Knowledge document deleted' };
  }

  async getDocumentById(id: string) {
    const doc = await knowledgeRepository.findById(id);
    if (!doc) {
      throw new AppError('Knowledge document not found', 404);
    }
    return doc;
  }

  async listDocuments(category?: string) {
    return knowledgeRepository.listDocuments(category);
  }

  /**
   * Searches relevant knowledge chunks using a hybrid relevance metric (keyword + vector score)
   */
  async searchRelevantKnowledge(
    query: string,
    options: SearchKnowledgeOptions = {}
  ): Promise<RelevantKnowledgeItem[]> {
    const limit = options.limit || 5;
    const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const queryVector = await defaultEmbeddingProvider.generateEmbedding(query);

    // Fetch chunks
    let chunks: any[] = [];
    try {
      chunks = await knowledgeRepository.searchChunks(options.category);
    } catch {
      // In case database table is empty or offline, fallback to empty
      chunks = [];
    }

    const scored: RelevantKnowledgeItem[] = [];

    for (const chunk of chunks) {
      const chunkText = chunk.content.toLowerCase();
      const docTitle = chunk.document.title.toLowerCase();

      // 1. Keyword overlap score
      let keywordHits = 0;
      for (const term of queryTerms) {
        if (chunkText.includes(term)) keywordHits += 1;
        if (docTitle.includes(term)) keywordHits += 2;
      }
      const keywordScore = queryTerms.length > 0 ? keywordHits / queryTerms.length : 0;

      // 2. Cosine similarity score
      let vectorScore = 0;
      if (chunk.embedding) {
        try {
          const chunkVec = JSON.parse(chunk.embedding);
          vectorScore = this.cosineSimilarity(queryVector, chunkVec);
        } catch {
          vectorScore = 0;
        }
      }

      // Hybrid score: 60% keyword, 40% vector
      const totalScore = Math.round((keywordScore * 0.6 + vectorScore * 0.4) * 100) / 100;

      if (totalScore > 0.05) {
        scored.push({
          id: chunk.id,
          documentId: chunk.document.id,
          title: chunk.document.title,
          category: chunk.document.category,
          content: chunk.content,
          source: chunk.document.source,
          score: totalScore,
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  /**
   * Formats top relevant documents into clean context string for RAG
   */
  async retrieveContext(query: string, options: SearchKnowledgeOptions = {}): Promise<{
    contextText: string;
    sources: Array<{ title: string; category: string; id: string }>;
  }> {
    const items = await this.searchRelevantKnowledge(query, options);

    if (items.length === 0) {
      return {
        contextText: 'No specific knowledge base documents matched the query.',
        sources: [],
      };
    }

    const contextText = items
      .map(
        (it, idx) =>
          `[Document ${idx + 1}: ${it.title} (${it.category})]\n${it.content}`
      )
      .join('\n\n');

    const sources = items.map((it) => ({
      title: it.title,
      category: it.category,
      id: it.documentId,
    }));

    return { contextText, sources };
  }

  /**
   * Helper to split text into overlapping chunks
   */
  private splitIntoChunks(text: string, chunkSize = 500, overlap = 100): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end).trim());
      if (end === text.length) break;
      start += chunkSize - overlap;
    }

    return chunks.filter((c) => c.length > 0);
  }

  /**
   * Cosine similarity between two normalized vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    return Math.max(0, Math.min(1, dot));
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();

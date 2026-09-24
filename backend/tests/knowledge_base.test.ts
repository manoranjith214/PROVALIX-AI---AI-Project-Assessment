import { knowledgeBaseService } from '../src/integrations/knowledge-base/KnowledgeBaseService';
import { knowledgeRepository } from '../src/integrations/knowledge-base/KnowledgeRepository';
import { defaultEmbeddingProvider } from '../src/integrations/embeddings/MockEmbeddingProvider';

jest.mock('../src/integrations/knowledge-base/KnowledgeRepository');

describe('AI Knowledge Base & Embedding Tests', () => {
  test('MockEmbeddingProvider generates normalized 64-dimensional float vector', async () => {
    const vector = await defaultEmbeddingProvider.generateEmbedding('Technical Implementation Guidelines');

    expect(vector).toHaveLength(64);
    expect(typeof vector[0]).toBe('number');

    // Check magnitude is normalized approximately to 1
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    expect(magnitude).toBeCloseTo(1, 1);
  });

  test('Adds knowledge document, chunks text, and stores via repository', async () => {
    const mockCreatedDoc = {
      id: 'doc-123',
      title: 'Plagiarism Deductions',
      category: 'Plagiarism Guidelines',
      content: 'Plagiarism guidelines detail how similarity percentages impact final scores.',
      chunks: [{ id: 'chunk-1', chunkIndex: 0, content: 'Plagiarism guidelines' }],
    };

    (knowledgeRepository.createDocument as jest.Mock).mockResolvedValue(mockCreatedDoc);

    const result = await knowledgeBaseService.addDocument({
      title: 'Plagiarism Deductions',
      category: 'Plagiarism Guidelines',
      content: 'Plagiarism guidelines detail how similarity percentages impact final scores.',
    });

    expect(result.id).toBe('doc-123');
    expect(knowledgeRepository.createDocument).toHaveBeenCalled();
  });

  test('Searches relevant knowledge using hybrid keyword and vector ranking', async () => {
    const mockChunks = [
      {
        id: 'c-1',
        content: 'Technical Implementation requires modular Clean Architecture and strongly typed models.',
        embedding: JSON.stringify(await defaultEmbeddingProvider.generateEmbedding('Technical Implementation')),
        document: {
          id: 'doc-arch',
          title: 'Technical Implementation Guidelines',
          category: 'Technical Implementation Guidelines',
          source: 'Provalix Manual',
        },
      },
      {
        id: 'c-2',
        content: 'Viva defense accounts for 25 marks across 5 questions.',
        embedding: JSON.stringify(await defaultEmbeddingProvider.generateEmbedding('Viva Voce')),
        document: {
          id: 'doc-viva',
          title: 'Viva Guidelines',
          category: 'Viva Guidelines',
          source: 'Exam Protocol',
        },
      },
    ];

    (knowledgeRepository.searchChunks as jest.Mock).mockResolvedValue(mockChunks);

    const matches = await knowledgeBaseService.searchRelevantKnowledge('How does technical architecture score?');

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].title).toBe('Technical Implementation Guidelines');
    expect(matches[0].score).toBeGreaterThan(0);
  });

  test('Retrieves formatted context with structured source references', async () => {
    const mockChunks = [
      {
        id: 'c-1',
        content: 'Problem definition evaluates scope and target beneficiaries (Max 15 marks).',
        embedding: JSON.stringify(await defaultEmbeddingProvider.generateEmbedding('Problem Definition')),
        document: {
          id: 'doc-prob',
          title: 'Problem Definition Rubric',
          category: 'Project Evaluation Criteria',
          source: 'Provalix Manual',
        },
      },
    ];

    (knowledgeRepository.searchChunks as jest.Mock).mockResolvedValue(mockChunks);

    const context = await knowledgeBaseService.retrieveContext('Explain Problem Definition criteria');

    expect(context.contextText).toContain('Problem Definition Rubric');
    expect(context.sources).toHaveLength(1);
    expect(context.sources[0].title).toBe('Problem Definition Rubric');
  });
});

import { datasetIngestionService } from '../src/datasets/DatasetIngestionService';
import { prisma } from '../src/config/prisma';
import path from 'path';

// Mock prisma.dataset and datasetRecord for unit testing ingestion pipeline
jest.mock('../src/config/prisma', () => ({
  prisma: {
    dataset: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'dataset-123', ...args.data })),
      update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
    },
    datasetRecord: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'rec-uuid', ...args.data })),
    },
    knowledgeDocument: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'doc-uuid', ...args.data })),
      findFirst: jest.fn().mockResolvedValue(null),
      findById: jest.fn().mockResolvedValue(null),
    },
    knowledgeChunk: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

describe('Dataset Ingestion Service Unit Tests', () => {
  test('Ingests valid JSON dataset from demo file and preserves source metadata', async () => {
    const demoJsonPath = path.resolve(__dirname, '../src/datasets/demo-evaluation-knowledge.json');
    const result = await datasetIngestionService.ingestFromFile(demoJsonPath, 'DEMO KNOWLEDGE DATA');

    expect(result.datasetId).toBeDefined();
    expect(result.validRecordsIngested).toBeGreaterThanOrEqual(10);
    expect(result.invalidRecordsSkipped).toBe(0);
    expect(result.duplicateRecordsIgnored).toBe(0);
    expect(prisma.dataset.create).toHaveBeenCalled();
  });

  test('Ingests valid CSV dataset with comma/quote separation', async () => {
    const demoCsvPath = path.resolve(__dirname, '../src/datasets/demo-evaluation-knowledge.csv');
    const result = await datasetIngestionService.ingestFromFile(demoCsvPath, 'DEMO CSV DATA');

    expect(result.validRecordsIngested).toBe(4);
    expect(result.invalidRecordsSkipped).toBe(0);
  });

  test('Rejects duplicate records within the same dataset payload', async () => {
    const duplicateJson = JSON.stringify([
      { title: 'Duplicate Title Test', content: 'Long enough content describing the test.', category: 'Test' },
      { title: 'Duplicate Title Test', content: 'Another content with exact same title.', category: 'Test' },
      { title: 'Unique Title', content: 'Unique content describing another guideline.', category: 'Test' },
    ]);

    const result = await datasetIngestionService.ingestContent(duplicateJson, 'json', 'Duplicate Test Dataset');

    expect(result.totalRecordsProcessed).toBe(3);
    expect(result.validRecordsIngested).toBe(2);
    expect(result.duplicateRecordsIgnored).toBe(1);
  });

  test('Filters out invalid records missing title or with short content', async () => {
    const invalidJson = JSON.stringify([
      { title: '', content: 'Valid length content but empty title.' },
      { title: 'Short Content', content: 'too short' },
      { title: 'Valid Record Title', content: 'Comprehensive text content satisfying all criteria.' },
    ]);

    const result = await datasetIngestionService.ingestContent(invalidJson, 'json', 'Invalid Records Test');

    expect(result.invalidRecordsSkipped).toBe(2);
    expect(result.validRecordsIngested).toBe(1);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('Throws descriptive error on unsupported file format', async () => {
    await expect(
      datasetIngestionService.ingestContent('some text', 'exe', 'Binary Test')
    ).rejects.toThrow('Unsupported dataset format');
  });
});

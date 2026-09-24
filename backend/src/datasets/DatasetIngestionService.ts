import fs from 'fs';
import path from 'path';
import { prisma } from '../config/prisma';
import { knowledgeBaseService } from '../integrations/knowledge-base/KnowledgeBaseService';
import { AppError } from '../middleware/errorMiddleware';

export interface RawKnowledgeRecord {
  id?: string;
  title: string;
  category: string;
  content: string;
  source?: string;
  version?: string;
  metadata?: any;
}

export interface IngestionResult {
  datasetId: string;
  datasetName: string;
  totalRecordsProcessed: number;
  validRecordsIngested: number;
  invalidRecordsSkipped: number;
  duplicateRecordsIgnored: number;
  errors: string[];
}

export class DatasetIngestionService {
  /**
   * Ingests a dataset from a file path (JSON, JSONL, CSV, TXT)
   */
  async ingestFromFile(filePath: string, datasetName?: string): Promise<IngestionResult> {
    if (!fs.existsSync(filePath)) {
      throw new AppError(`Dataset file not found at path: ${filePath}`, 404);
    }

    const ext = path.extname(filePath).toLowerCase();
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const name = datasetName || path.basename(filePath, ext);

    return this.ingestContent(rawContent, ext, name);
  }

  /**
   * Ingests and parses raw dataset content
   */
  async ingestContent(rawContent: string, format: string, datasetName: string): Promise<IngestionResult> {
    const cleanFormat = format.startsWith('.') ? format.slice(1).toLowerCase() : format.toLowerCase();
    const allowedFormats = ['json', 'jsonl', 'csv', 'txt', 'pdf'];

    if (!allowedFormats.includes(cleanFormat)) {
      throw new AppError(`Unsupported dataset format: ${cleanFormat}. Supported: JSON, JSONL, CSV, TXT, PDF`, 400);
    }

    const errors: string[] = [];
    let parsedRecords: RawKnowledgeRecord[] = [];

    // Parse according to format
    try {
      if (cleanFormat === 'json') {
        const json = JSON.parse(rawContent);
        if (Array.isArray(json)) {
          parsedRecords = json;
        } else if (json.records && Array.isArray(json.records)) {
          parsedRecords = json.records;
        } else {
          throw new Error('JSON structure must be an array of records or an object containing a "records" array.');
        }
      } else if (cleanFormat === 'jsonl') {
        parsedRecords = rawContent
          .split('\n')
          .filter((line) => line.trim().length > 0)
          .map((line, idx) => {
            try {
              return JSON.parse(line);
            } catch {
              errors.push(`JSONL parse error on line ${idx + 1}`);
              return null;
            }
          })
          .filter(Boolean) as RawKnowledgeRecord[];
      } else if (cleanFormat === 'csv') {
        parsedRecords = this.parseCsv(rawContent);
      } else if (cleanFormat === 'txt') {
        parsedRecords = this.parseTxt(rawContent, datasetName);
      } else if (cleanFormat === 'pdf') {
        // Text extracted from PDF content
        parsedRecords = this.parseTxt(rawContent, datasetName);
      }
    } catch (err: any) {
      throw new AppError(`Malformed dataset content for format ${cleanFormat}: ${err.message}`, 422);
    }

    // Create Dataset database entry
    const dataset = await prisma.dataset.create({
      data: {
        name: datasetName,
        description: `Ingested dataset (${cleanFormat.toUpperCase()})`,
        fileType: cleanFormat.toUpperCase(),
        version: '1.0',
      },
    });

    const seenTitles = new Set<string>();
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCount = 0;

    for (const rec of parsedRecords) {
      // 1. Validation of required fields
      if (!rec || typeof rec !== 'object') {
        invalidCount++;
        errors.push('Record is not a valid object');
        continue;
      }

      const title = (rec.title || '').trim();
      const content = (rec.content || '').trim();
      const category = (rec.category || 'General Guidelines').trim();

      if (!title || title.length < 3) {
        invalidCount++;
        errors.push(`Invalid record: title is missing or too short ("${title}")`);
        continue;
      }

      if (!content || content.length < 10) {
        invalidCount++;
        errors.push(`Invalid record "${title}": content is missing or too short`);
        continue;
      }

      // Check max document size (e.g. 50,000 characters limit per chunk/doc)
      if (content.length > 50000) {
        invalidCount++;
        errors.push(`Oversized record "${title}": content exceeds 50k characters limit`);
        continue;
      }

      // 2. Duplicate Detection
      const normalizedKey = title.toLowerCase();
      if (seenTitles.has(normalizedKey)) {
        duplicateCount++;
        continue;
      }
      seenTitles.add(normalizedKey);

      // 3. Persist DatasetRecord
      await prisma.datasetRecord.create({
        data: {
          datasetId: dataset.id,
          title,
          content,
          category,
          metadata: JSON.stringify({
            originalId: rec.id,
            source: rec.source || datasetName,
            version: rec.version || '1.0',
          }),
          status: 'Valid',
        },
      });

      // 4. Index as KnowledgeDocument in KnowledgeBaseService
      try {
        await knowledgeBaseService.addDocument({
          title,
          category,
          content,
          source: rec.source || datasetName,
          version: rec.version || '1.0',
        });
      } catch {
        // If already exists in KnowledgeDocument, ignore duplicate
      }

      validCount++;
    }

    // Update dataset record count
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: { recordCount: validCount },
    });

    return {
      datasetId: dataset.id,
      datasetName,
      totalRecordsProcessed: parsedRecords.length,
      validRecordsIngested: validCount,
      invalidRecordsSkipped: invalidCount,
      duplicateRecordsIgnored: duplicateCount,
      errors,
    };
  }

  /**
   * Basic CSV parser supporting quoted strings
   */
  private parseCsv(csvText: string): RawKnowledgeRecord[] {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const records: RawKnowledgeRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;

      const recordObj: any = {};
      headers.forEach((header, index) => {
        recordObj[header] = values[index] || '';
      });

      records.push({
        id: recordObj.id,
        title: recordObj.title || recordObj.name || '',
        category: recordObj.category || 'General',
        content: recordObj.content || recordObj.description || recordObj.text || '',
        source: recordObj.source,
      });
    }

    return records;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  /**
   * Plain text parser splitting sections by double line break
   */
  private parseTxt(txt: string, datasetName: string): RawKnowledgeRecord[] {
    const sections = txt.split(/\n\s*\n/).filter((s) => s.trim().length > 0);
    return sections.map((sec, idx) => {
      const lines = sec.trim().split('\n');
      const title = lines[0].replace(/^#+\s*/, '').trim() || `Section ${idx + 1}`;
      const content = lines.slice(1).join('\n').trim() || lines[0];

      return {
        id: `TXT-${idx + 1}`,
        title,
        category: 'Text Guidelines',
        content,
        source: datasetName,
      };
    });
  }
}

export const datasetIngestionService = new DatasetIngestionService();

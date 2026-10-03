import fs from 'fs';
import path from 'path';
import { CodeSnippet } from './PlagiarismProvider.interface';

const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs',
  '.go', '.rs', '.php', '.rb', '.html', '.css', '.sql', '.sh'
]);

export class SourceExtractor {
  /**
   * Extracts source code snippets from submission resources or local files
   */
  async extractCodeSnippets(resources: any[] = []): Promise<CodeSnippet[]> {
    const snippets: CodeSnippet[] = [];

    for (const res of resources) {
      const filePath = res.path || res.storagePath;
      if (filePath && fs.existsSync(filePath)) {
        try {
          const ext = path.extname(filePath).toLowerCase();
          if (CODE_EXTENSIONS.has(ext)) {
            const stat = await fs.promises.stat(filePath);
            // Limit file size to 1MB to prevent excessive memory usage
            if (stat.size < 1024 * 1024) {
              const content = await fs.promises.readFile(filePath, 'utf-8');
              snippets.push({
                path: res.name || path.basename(filePath),
                content,
                language: ext.slice(1),
              });
            }
          }
        } catch (err) {
          console.warn(`[SourceExtractor] Could not read resource file at ${filePath}:`, err);
        }
      }
    }

    return snippets;
  }

  /**
   * Extracts textual content from report resources or submission descriptions
   */
  extractTextContent(description?: string, problemStatement?: string, proposedSolution?: string): string {
    const parts = [description, problemStatement, proposedSolution].filter(Boolean);
    return parts.join('\n\n');
  }
}

export const sourceExtractor = new SourceExtractor();

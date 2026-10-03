import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export interface CodeSmell {
  file: string;
  rule: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SourceAnalysisResult {
  sourceAvailable: boolean;
  fileCount: number;
  lineCount: number;
  languages: Record<string, { files: number; lines: number }>;
  primaryLanguage: string;
  dependencies: string[];
  hasTests: boolean;
  testFileCount: number;
  hasDocumentation: boolean;
  readmeSummary?: string;
  configFiles: string[];
  codeSmells: CodeSmell[];
  duplicationPercentage: number;
  summary: string;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript (React)',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript (React)',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.go': 'Go',
  '.rs': 'Rust',
  '.php': 'PHP',
  '.rb': 'Ruby',
  '.html': 'HTML',
  '.css': 'CSS',
  '.sql': 'SQL',
};

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  '__pycache__',
  '.pytest_cache',
  'vendor',
  '.idea',
  '.vscode',
]);

export class SourceCodeAnalyzer {
  /**
   * Performs real, language-agnostic source-code inspection on submitted files/archives.
   */
  async analyzeProjectSource(project: any): Promise<SourceAnalysisResult> {
    const resources = Array.isArray(project.resources) ? project.resources : [];

    // Locate zip archives or direct source files
    let zipResource: any = null;
    const directCodeFiles: any[] = [];

    for (const r of resources) {
      const p = r.path || r.storagePath || '';
      const name = (r.name || '').toLowerCase();
      const ext = path.extname(name || p).toLowerCase();

      if (ext === '.zip') {
        zipResource = r;
      } else if (EXTENSION_LANGUAGE_MAP[ext]) {
        directCodeFiles.push(r);
      }
    }

    if (zipResource) {
      return this.analyzeZipArchive(zipResource);
    }

    if (directCodeFiles.length > 0) {
      return this.analyzeDirectFiles(directCodeFiles);
    }

    return {
      sourceAvailable: false,
      fileCount: 0,
      lineCount: 0,
      languages: {},
      primaryLanguage: 'None',
      dependencies: [],
      hasTests: false,
      testFileCount: 0,
      hasDocumentation: false,
      configFiles: [],
      codeSmells: [],
      duplicationPercentage: 0,
      summary: 'No source code archive or code files were submitted. Code Quality evaluated as Insufficient Evidence.',
    };
  }

  private async analyzeZipArchive(resource: any): Promise<SourceAnalysisResult> {
    const filePath = resource.path || resource.storagePath;
    if (!filePath || !fs.existsSync(filePath)) {
      return {
        sourceAvailable: false,
        fileCount: 0,
        lineCount: 0,
        languages: {},
        primaryLanguage: 'None',
        dependencies: [],
        hasTests: false,
        testFileCount: 0,
        hasDocumentation: false,
        configFiles: [],
        codeSmells: [],
        duplicationPercentage: 0,
        summary: 'Source code archive record exists but file could not be read from storage.',
      };
    }

    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();

      // Guard against zip bombs: enforce maximum total entries
      const MAX_ZIP_ENTRIES = 2000;
      const MAX_TOTAL_UNCOMPRESSED_BYTES = 100 * 1024 * 1024; // 100MB max total uncompressed
      const MAX_ENTRY_BYTES = 5 * 1024 * 1024; // 5MB max single entry

      if (zipEntries.length > MAX_ZIP_ENTRIES) {
        console.warn(`[SourceCodeAnalyzer] Zip archive exceeds maximum entry limit (${zipEntries.length} > ${MAX_ZIP_ENTRIES}). Processing first ${MAX_ZIP_ENTRIES} entries.`);
      }

      let totalLines = 0;
      let fileCount = 0;
      let totalUncompressedBytes = 0;
      const languages: Record<string, { files: number; lines: number }> = {};
      const dependencies = new Set<string>();
      const configFiles = new Set<string>();
      let testFileCount = 0;
      let hasDocumentation = false;
      let readmeSummary = '';
      const codeSmells: CodeSmell[] = [];
      const lineHashes = new Map<string, number>();
      let duplicateLines = 0;

      const entriesToProcess = zipEntries.slice(0, MAX_ZIP_ENTRIES);

      for (const entry of entriesToProcess) {
        if (entry.isDirectory) continue;

        const entryPath = entry.entryName.replace(/\\/g, '/');

        // Path traversal and null byte protection
        if (entryPath.includes('..') || entryPath.startsWith('/') || entryPath.includes('\0')) {
          console.warn(`[SourceCodeAnalyzer] Skipping suspicious entry with path traversal: ${entryPath}`);
          continue;
        }

        // Decompression limit protection (zip bomb defense)
        if (entry.header && entry.header.size > MAX_ENTRY_BYTES) {
          console.warn(`[SourceCodeAnalyzer] Skipping oversize entry (${entry.header.size} bytes): ${entryPath}`);
          continue;
        }

        totalUncompressedBytes += entry.header?.size || 0;
        if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          console.warn('[SourceCodeAnalyzer] Total uncompressed archive size limit reached (100MB). Halting further extraction.');
          break;
        }

        const segments = entryPath.split('/');

        // Skip ignored directories
        if (segments.some((s) => IGNORED_DIRS.has(s.toLowerCase()))) {
          continue;
        }

        const fileName = path.basename(entryPath);
        const ext = path.extname(fileName).toLowerCase();

        fileCount++;

        // Detect Config / Build Files
        if (
          fileName === 'package.json' ||
          fileName === 'tsconfig.json' ||
          fileName === 'Dockerfile' ||
          fileName === 'docker-compose.yml' ||
          fileName === 'requirements.txt' ||
          fileName === 'Pipfile' ||
          fileName === 'pom.xml' ||
          fileName === 'build.gradle' ||
          fileName === 'Cargo.toml' ||
          fileName === 'go.mod'
        ) {
          configFiles.add(fileName);
        }

        // Detect Documentation
        if (fileName.toLowerCase().startsWith('readme')) {
          hasDocumentation = true;
          try {
            const readmeText = entry.getData().toString('utf-8');
            readmeSummary = readmeText.slice(0, 300).replace(/\r?\n/g, ' ').trim();
          } catch {
            // Ignore encoding errors
          }
        }

        // Detect Tests
        const isTest =
          entryPath.toLowerCase().includes('/test/') ||
          entryPath.toLowerCase().includes('/tests/') ||
          entryPath.toLowerCase().includes('/__tests__/') ||
          fileName.toLowerCase().includes('.test.') ||
          fileName.toLowerCase().includes('.spec.') ||
          fileName.toLowerCase().startsWith('test_');

        if (isTest) {
          testFileCount++;
        }

        // Parse Code files
        const lang = EXTENSION_LANGUAGE_MAP[ext];
        if (lang) {
          try {
            const content = entry.getData().toString('utf-8');
            const lines = content.split('\n');
            const lineCount = lines.length;
            totalLines += lineCount;

            if (!languages[lang]) {
              languages[lang] = { files: 0, lines: 0 };
            }
            languages[lang].files++;
            languages[lang].lines += lineCount;

            // Inspect Code Smells
            this.inspectCodeSmells(fileName, lines, codeSmells);

            // Estimate Duplication via non-empty trimmed line hashing
            for (const l of lines) {
              const trimmed = l.trim();
              if (trimmed.length > 25) {
                const count = lineHashes.get(trimmed) || 0;
                lineHashes.set(trimmed, count + 1);
                if (count >= 1) {
                  duplicateLines++;
                }
              }
            }
          } catch {
            // Ignore binary / unreadable entries
          }
        }

        // Parse dependencies from package.json or requirements.txt
        if (fileName === 'package.json') {
          try {
            const pkg = JSON.parse(entry.getData().toString('utf-8'));
            const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
            Object.keys(deps).forEach((d) => dependencies.add(d));
          } catch {
            // Ignore json parse error
          }
        } else if (fileName === 'requirements.txt') {
          try {
            const reqs = entry.getData().toString('utf-8').split('\n');
            for (const r of reqs) {
              const clean = r.split('==')[0].split('>=')[0].split('<=')[0].trim();
              if (clean && !clean.startsWith('#')) {
                dependencies.add(clean);
              }
            }
          } catch {
            // Ignore read error
          }
        }
      }

      // Determine primary language
      let primaryLanguage = 'None';
      let maxLines = 0;
      for (const [lang, stats] of Object.entries(languages)) {
        if (stats.lines > maxLines) {
          maxLines = stats.lines;
          primaryLanguage = lang;
        }
      }

      const duplicationPercentage =
        totalLines > 0 ? Math.min(100, Math.round((duplicateLines / totalLines) * 100)) : 0;

      return {
        sourceAvailable: true,
        fileCount,
        lineCount: totalLines,
        languages,
        primaryLanguage,
        dependencies: Array.from(dependencies).slice(0, 30),
        hasTests: testFileCount > 0,
        testFileCount,
        hasDocumentation,
        readmeSummary: readmeSummary || undefined,
        configFiles: Array.from(configFiles),
        codeSmells: codeSmells.slice(0, 10),
        duplicationPercentage,
        summary: `Inspected archive: ${fileCount} files, ${totalLines} LOC across ${Object.keys(languages).join(', ') || 'scripts'}. Primary: ${primaryLanguage}. Tests: ${testFileCount} files. Duplication: ~${duplicationPercentage}%.`,
      };
    } catch (err: any) {
      console.warn('[SourceCodeAnalyzer] Failed to parse zip archive:', err?.message || err);
      return {
        sourceAvailable: false,
        fileCount: 0,
        lineCount: 0,
        languages: {},
        primaryLanguage: 'None',
        dependencies: [],
        hasTests: false,
        testFileCount: 0,
        hasDocumentation: false,
        configFiles: [],
        codeSmells: [],
        duplicationPercentage: 0,
        summary: 'Error inspecting source code archive structure.',
      };
    }
  }

  private async analyzeDirectFiles(files: any[]): Promise<SourceAnalysisResult> {
    let totalLines = 0;
    const languages: Record<string, { files: number; lines: number }> = {};
    const codeSmells: CodeSmell[] = [];

    for (const f of files) {
      const filePath = f.path || f.storagePath;
      if (filePath && fs.existsSync(filePath)) {
        try {
          const content = await fs.promises.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          const ext = path.extname(filePath).toLowerCase();
          const lang = EXTENSION_LANGUAGE_MAP[ext] || 'Code';

          totalLines += lines.length;
          if (!languages[lang]) {
            languages[lang] = { files: 0, lines: 0 };
          }
          languages[lang].files++;
          languages[lang].lines += lines.length;

          this.inspectCodeSmells(path.basename(filePath), lines, codeSmells);
        } catch {
          // Ignore
        }
      }
    }

    const primary = Object.keys(languages)[0] || 'Code';

    return {
      sourceAvailable: files.length > 0,
      fileCount: files.length,
      lineCount: totalLines,
      languages,
      primaryLanguage: primary,
      dependencies: [],
      hasTests: false,
      testFileCount: 0,
      hasDocumentation: false,
      configFiles: [],
      codeSmells: codeSmells.slice(0, 10),
      duplicationPercentage: 0,
      summary: `Analyzed ${files.length} direct source file(s) (${totalLines} LOC).`,
    };
  }

  private inspectCodeSmells(fileName: string, lines: string[], smells: CodeSmell[]): void {
    let nestedDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Secret / password detection
      if (
        /(?:password|passwd|secret|api_key|apikey|access_token|private_key)\s*[:=]\s*["'][a-zA-Z0-9_-]{8,}["']/i.test(
          trimmed
        )
      ) {
        smells.push({
          file: fileName,
          rule: 'Hardcoded Secret',
          message: `Line ${i + 1}: Possible hardcoded credential or API key found.`,
          severity: 'high',
        });
      }

      // Excessive nesting (> 5 levels)
      const leadingSpaces = line.search(/\S/);
      if (leadingSpaces > 20) {
        nestedDepth++;
        if (nestedDepth === 1) {
          smells.push({
            file: fileName,
            rule: 'Excessive Nesting',
            message: `Line ${i + 1}: Deep indentation detected (> 5 levels of nesting).`,
            severity: 'low',
          });
        }
      } else {
        nestedDepth = 0;
      }
    }

    // Function length smell
    if (lines.length > 300) {
      smells.push({
        file: fileName,
        rule: 'Large File / Monolith',
        message: `File has ${lines.length} lines. Consider modularizing into smaller functions/classes.`,
        severity: 'medium',
      });
    }
  }
}

export const sourceCodeAnalyzer = new SourceCodeAnalyzer();

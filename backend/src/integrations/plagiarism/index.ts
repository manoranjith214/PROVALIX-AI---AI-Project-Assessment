import {
  PlagiarismProvider,
  PlagiarismAnalysisResult,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  CodeSnippet,
  PlagiarismProviderType,
} from './PlagiarismProvider.interface';
import { MockPlagiarismProvider, defaultPlagiarismProvider } from './MockPlagiarismProvider';
import { UnavailablePlagiarismProvider } from './UnavailablePlagiarismProvider';
import { sourceExtractor } from './sourceExtractor';
import { codeNormalizer } from './codeNormalizer';
import { config } from '../../config/env';

let activeProvider: PlagiarismProvider | null = null;

export function getPlagiarismProvider(): PlagiarismProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const isProduction = config.nodeEnv === 'production';
  const requestedProvider = (config.plagiarism.provider || '').toLowerCase();
  const hasRealKey = Boolean(config.plagiarism.apiKey && config.plagiarism.apiKey.trim().length > 0);

  if (requestedProvider === 'real') {
    if (hasRealKey) {
      // If a real external provider was configured with credentials, it would be instantiated here.
      // Since no external credentials are configured in this environment, provide an UnavailablePlagiarismProvider.
      activeProvider = new UnavailablePlagiarismProvider('External plagiarism verification API is not configured.');
    } else if (isProduction) {
      activeProvider = new UnavailablePlagiarismProvider('Real plagiarism provider API key is not configured in production.');
    } else {
      activeProvider = new MockAIPlagiarismDevFallback();
    }
  } else if (requestedProvider === 'mock') {
    if (isProduction) {
      console.error(
        '🚨 [PlagiarismProvider]: CRITICAL: MockPlagiarismProvider is prohibited in production paths.'
      );
      activeProvider = new UnavailablePlagiarismProvider('Mock plagiarism provider cannot be used in production environment.');
    } else {
      activeProvider = new MockPlagiarismProvider();
    }
  } else if (isProduction) {
    // Production default: must fail safely rather than silently returning mock results
    activeProvider = new UnavailablePlagiarismProvider('No real plagiarism provider is configured in production.');
  } else {
    // Development/test default
    activeProvider = new MockPlagiarismProvider();
  }

  return activeProvider;
}

class MockAIPlagiarismDevFallback extends MockPlagiarismProvider {
  override readonly providerName = 'MockPlagiarismDevFallback';
}

export function resetPlagiarismProvider(): void {
  activeProvider = null;
}

/**
 * Executes the complete Plagiarism Architecture Pipeline:
 * Submission
 * → source/file extraction
 * → code normalization
 * → plagiarism provider
 * → similarity analysis
 * → plagiarism result
 * → AI evaluation
 */
export async function runPlagiarismPipeline(options: {
  submissionOrProject: any;
  resources?: any[];
  githubUrl?: string;
  description?: string;
}): Promise<PlagiarismAnalysisResult> {
  const { submissionOrProject, resources = [], githubUrl, description } = options;

  // 1. Source / File Extraction
  const extractedSnippets = await sourceExtractor.extractCodeSnippets(resources);
  const textContent = sourceExtractor.extractTextContent(
    description || submissionOrProject.description,
    submissionOrProject.problemStatement,
    submissionOrProject.proposedSolution
  );

  // 2. Code Normalization
  const normalizedSnippets: CodeSnippet[] = extractedSnippets.map((snippet) => ({
    ...snippet,
    content: codeNormalizer.normalize(snippet.content),
  }));

  // 3. Plagiarism Provider
  const provider = getPlagiarismProvider();

  // 4. Similarity Analysis & Plagiarism Result
  const result = await provider.analyzeFullSubmission(
    normalizedSnippets.length > 0 ? normalizedSnippets : githubUrl || submissionOrProject.githubUrl,
    textContent
  );

  return result;
}

export {
  PlagiarismProvider,
  PlagiarismAnalysisResult,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  CodeSnippet,
  PlagiarismProviderType,
  MockPlagiarismProvider,
  UnavailablePlagiarismProvider,
  defaultPlagiarismProvider,
  sourceExtractor,
  codeNormalizer,
};

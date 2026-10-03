import {
  PlagiarismProvider,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  PlagiarismAnalysisResult,
  PlagiarismProviderType,
} from './PlagiarismProvider.interface';

export class MockPlagiarismProvider implements PlagiarismProvider {
  readonly providerName: string = 'MockPlagiarismProvider';
  readonly providerType: PlagiarismProviderType = 'mock';

  isAvailable(): boolean {
    return true;
  }

  async checkCodeSimilarity(_codeFilesOrArchive?: any[] | string): Promise<CodeSimilarityResult> {
    return {
      codeSimilarityPercentage: 0,
      matchedSources: [],
      matchedSnippetsCount: 0,
    };
  }

  async checkDocumentSimilarity(_documentOrText?: any | string): Promise<DocumentSimilarityResult> {
    return {
      documentSimilarityPercentage: 0,
      matchedSources: [],
      matchedPassagesCount: 0,
    };
  }

  async analyzeFullSubmission(_codeResource?: any, _reportResource?: any): Promise<PlagiarismAnalysisResult> {
    // Explicitly labeled as development/demo mode only.
    return {
      codeSimilarity: 0,
      reportSimilarity: 0,
      overallSimilarity: 0,
      status: 'Low',
      matchedSources: [],
      deduction: 0,
      reason: undefined,
      feedback: 'Plagiarism check completed using Mock provider (Development / Test mode only). Cross-corpus comparison is not active.',
      isDemoData: true,
      providerName: this.providerName,
      providerType: this.providerType,
    };
  }
}

export const defaultPlagiarismProvider = new MockPlagiarismProvider();

import {
  PlagiarismProvider,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  PlagiarismAnalysisResult,
} from './PlagiarismProvider.interface';

export class MockPlagiarismProvider implements PlagiarismProvider {
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

  async analyzeFullSubmission(codeResource?: any, reportResource?: any): Promise<PlagiarismAnalysisResult> {
    // Label clearly as DEMO/UNAVAILABLE. Do not fabricate matched sources.
    return {
      codeSimilarity: 0,
      reportSimilarity: 0,
      overallSimilarity: 0,
      status: 'Low',
      matchedSources: [],
      deduction: 0,
      reason: undefined,
      feedback: 'Plagiarism check service is currently in DEMO mode. Real cross-corpus plagiarism verification is unavailable.',
      isDemoData: true,
    };
  }
}

export const defaultPlagiarismProvider = new MockPlagiarismProvider();

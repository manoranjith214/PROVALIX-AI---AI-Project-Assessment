export type PlagiarismProviderType = 'mock' | 'real' | 'unavailable';

export interface CodeSnippet {
  path?: string;
  content: string;
  language?: string;
}

export interface CodeSimilarityResult {
  codeSimilarityPercentage: number;
  matchedSources: string[];
  matchedSnippetsCount: number;
}

export interface DocumentSimilarityResult {
  documentSimilarityPercentage: number;
  matchedSources: string[];
  matchedPassagesCount: number;
}

export interface PlagiarismAnalysisResult {
  codeSimilarity: number;
  reportSimilarity: number;
  overallSimilarity: number;
  status: 'Low' | 'Moderate' | 'High';
  matchedSources: string[];
  deduction: number;
  reason?: string;
  feedback: string;
  isDemoData: boolean;
  providerName: string;
  providerType: PlagiarismProviderType;
}

export interface PlagiarismProvider {
  readonly providerName: string;
  readonly providerType: PlagiarismProviderType;
  isAvailable(): boolean;
  checkCodeSimilarity(codeFilesOrArchive?: any[] | string): Promise<CodeSimilarityResult>;
  checkDocumentSimilarity(documentOrText?: any | string): Promise<DocumentSimilarityResult>;
  analyzeFullSubmission(codeResourceOrInput?: any, reportResource?: any): Promise<PlagiarismAnalysisResult>;
}

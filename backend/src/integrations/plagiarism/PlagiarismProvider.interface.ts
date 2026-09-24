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
}

export interface PlagiarismProvider {
  checkCodeSimilarity(codeFilesOrArchive: any[] | string): Promise<CodeSimilarityResult>;
  checkDocumentSimilarity(documentOrText: any | string): Promise<DocumentSimilarityResult>;
  analyzeFullSubmission(codeResource?: any, reportResource?: any): Promise<PlagiarismAnalysisResult>;
}

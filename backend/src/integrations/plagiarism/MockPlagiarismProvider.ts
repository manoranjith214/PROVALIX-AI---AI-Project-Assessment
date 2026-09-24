import {
  PlagiarismProvider,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  PlagiarismAnalysisResult,
} from './PlagiarismProvider.interface';

export class MockPlagiarismProvider implements PlagiarismProvider {
  async checkCodeSimilarity(_codeFilesOrArchive?: any[] | string): Promise<CodeSimilarityResult> {
    // Deterministic mock similarity analysis
    const similarity = 7.4;
    return {
      codeSimilarityPercentage: similarity,
      matchedSources: ['github.com/react-boilerplate/starter', 'npmjs.com/package/express-generator'],
      matchedSnippetsCount: 3,
    };
  }

  async checkDocumentSimilarity(_documentOrText?: any | string): Promise<DocumentSimilarityResult> {
    const similarity = 9.8;
    return {
      documentSimilarityPercentage: similarity,
      matchedSources: ['ieeexplore.ieee.org/abstract/document/sample-paper', 'acm.org/digital-library/ai-evaluation'],
      matchedPassagesCount: 2,
    };
  }

  async analyzeFullSubmission(codeResource?: any, reportResource?: any): Promise<PlagiarismAnalysisResult> {
    const codeResult = await this.checkCodeSimilarity(codeResource);
    const docResult = await this.checkDocumentSimilarity(reportResource);

    const codeSimilarity = codeResult.codeSimilarityPercentage;
    const reportSimilarity = docResult.documentSimilarityPercentage;
    const overallSimilarity = Math.round(((codeSimilarity + reportSimilarity) / 2) * 10) / 10;

    let status: 'Low' | 'Moderate' | 'High' = 'Low';
    let deduction = 0;
    let reason: string | undefined = undefined;
    let feedback = 'Plagiarism check passed. Code and report content are well within acceptable academic similarity standards.';

    if (overallSimilarity > 35) {
      status = 'High';
      deduction = 15;
      reason = 'Significant verbatim duplication found in submitted report and core algorithms.';
      feedback = 'High similarity detected with public datasets and codebases. Penalty applied to AI evaluation.';
    } else if (overallSimilarity > 18) {
      status = 'Moderate';
      deduction = 5;
      reason = 'Boilerplate structure and standard terminology matched existing public repositories.';
      feedback = 'Moderate template similarity noted. Minor deduction applied.';
    }

    const matchedSources = Array.from(new Set([...codeResult.matchedSources, ...docResult.matchedSources]));

    return {
      codeSimilarity,
      reportSimilarity,
      overallSimilarity,
      status,
      matchedSources,
      deduction,
      reason,
      feedback,
      isDemoData: true,
    };
  }
}

export const defaultPlagiarismProvider = new MockPlagiarismProvider();

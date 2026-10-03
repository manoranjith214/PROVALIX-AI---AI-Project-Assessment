import {
  PlagiarismProvider,
  CodeSimilarityResult,
  DocumentSimilarityResult,
  PlagiarismAnalysisResult,
  PlagiarismProviderType,
} from './PlagiarismProvider.interface';
import { AppError } from '../../middleware/errorMiddleware';

export class UnavailablePlagiarismProvider implements PlagiarismProvider {
  readonly providerName = 'UnavailablePlagiarismProvider';
  readonly providerType: PlagiarismProviderType = 'unavailable';
  private reason: string;

  constructor(reason = 'Real plagiarism verification provider is not configured or unavailable in production.') {
    this.reason = reason;
  }

  isAvailable(): boolean {
    return false;
  }

  async checkCodeSimilarity(_codeFilesOrArchive?: any[] | string): Promise<CodeSimilarityResult> {
    throw new AppError(`Code similarity check unavailable: ${this.reason}`, 503);
  }

  async checkDocumentSimilarity(_documentOrText?: any | string): Promise<DocumentSimilarityResult> {
    throw new AppError(`Document similarity check unavailable: ${this.reason}`, 503);
  }

  async analyzeFullSubmission(_codeResource?: any, _reportResource?: any): Promise<PlagiarismAnalysisResult> {
    throw new AppError(`Plagiarism check unavailable: ${this.reason}. External plagiarism verification credentials must be configured.`, 503);
  }
}

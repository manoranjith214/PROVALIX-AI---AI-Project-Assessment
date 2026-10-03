import { AIProvider } from './AIProvider.interface';
import { AppError } from '../../middleware/errorMiddleware';

export class UnavailableAIProvider implements AIProvider {
  private reason: string;

  constructor(reason = 'AI evaluation service is unavailable: real AI provider is not configured.') {
    this.reason = reason;
  }

  async evaluateProject(_projectData: any, _plagiarismData?: any, _evidenceData?: any): Promise<any> {
    throw new AppError(`Project evaluation unavailable: ${this.reason}`, 503);
  }

  async evaluateClassroomSubmission(_submissionData: any, _plagiarismData?: any, _evidenceData?: any): Promise<any> {
    throw new AppError(`Classroom AI evaluation unavailable: ${this.reason}`, 503);
  }

  async generateFeedback(_context: string, _score: number): Promise<string> {
    throw new AppError(`AI feedback generation unavailable: ${this.reason}`, 503);
  }

  async generateImprovementPlan(_weaknesses: string[]): Promise<any> {
    throw new AppError(`AI improvement plan unavailable: ${this.reason}`, 503);
  }

  async generateResponse(
    _userMessage: string,
    _context?: string,
    _conversationHistory?: Array<{ role: string; message: string }>,
    _detectedLanguage?: string
  ): Promise<string> {
    throw new AppError(`AI response generation unavailable: ${this.reason}`, 503);
  }

  async summarizeReport(_reportData: any): Promise<string> {
    throw new AppError(`Report summarization unavailable: ${this.reason}`, 503);
  }

  async generateVivaQuestions(_submissionData: any): Promise<any> {
    throw new AppError(`Viva generation unavailable: ${this.reason}`, 503);
  }
}

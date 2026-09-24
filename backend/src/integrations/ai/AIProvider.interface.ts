export interface CriteriaScore {
  name: string;
  maxScore: number;
  obtainedScore: number;
  feedback: string;
}

export interface ImprovementItem {
  area: string;
  suggestion: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ProjectCheckerEvaluationResult {
  overallScore: number; // Max 100
  criteria: {
    problemDefinition: CriteriaScore; // Max 15
    innovationNovelty: CriteriaScore; // Max 20
    technicalImplementation: CriteriaScore; // Max 20
    functionality: CriteriaScore; // Max 15
    codeQuality: CriteriaScore; // Max 10
    documentation: CriteriaScore; // Max 10
    overallQuality: CriteriaScore; // Max 10
  };
  strengths: string[];
  weaknesses: string[];
  technicalAnalysis: string;
  codeAnalysis: string;
  documentationAnalysis: string;
  actionableSuggestions: string[];
  improvementPlan: ImprovementItem[];
  summary: string;
  aiModel: string;
}

export interface ClassroomAIEvaluationResult {
  rawScore: number; // Max 50
  codeSimilarity: number;
  reportSimilarity: number;
  overallSimilarity: number;
  deduction: number; // Plagiarism deduction applied directly into AI /50
  finalScore: number; // rawScore - deduction
  plagiarismStatus: 'Low' | 'Moderate' | 'High';
  plagiarismReason?: string;
  matchedSources?: string[];
  feedback: string;
  improvementPlan: ImprovementItem[];
  isDemoData: boolean;
}

export type VivaCategory =
  | 'Problem Understanding'
  | 'Technical Implementation'
  | 'Technology / Algorithm Choice'
  | 'Feature / Internal Working'
  | 'Scenario / Challenge / Failure Handling';

export interface GeneratedVivaQuestion {
  questionNumber: number;
  category: VivaCategory;
  questionText: string;
  maxScore: number; // 5.0
}

export interface AIProvider {
  evaluateProject(projectData: any, plagiarismData?: any): Promise<ProjectCheckerEvaluationResult>;
  evaluateClassroomSubmission(submissionData: any, plagiarismData?: any): Promise<ClassroomAIEvaluationResult>;
  generateFeedback(context: string, score: number): Promise<string>;
  generateImprovementPlan(weaknesses: string[]): Promise<ImprovementItem[]>;
  generateResponse(
    userMessage: string,
    context?: string,
    conversationHistory?: Array<{ role: string; message: string }>,
    detectedLanguage?: string
  ): Promise<string>;
  summarizeReport(reportData: any): Promise<string>;
  generateVivaQuestions(submissionData: any): Promise<GeneratedVivaQuestion[]>;
}

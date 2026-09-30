export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT_EVIDENCE';

export interface RubricCriterionConfig {
  id: string;
  name: string;
  maxScore: number;
  description: string;
  evidenceRequirements: string[];
}

export interface CriterionEvaluationResult {
  name: string;
  score: number;
  maxScore: number;
  justification: string;
  evidence: string[];
  confidence: ConfidenceLevel;
}

export interface EvidenceClassification {
  userClaims: string[];
  verifiedEvidence: string[];
  unverifiedClaims: string[];
  missingEvidence: string[];
  inconsistencies: string[];
  evidenceQuality: 'HIGH' | 'MEDIUM' | 'LOW' | 'INSUFFICIENT';
  summary: string;
}

export interface StructuredAIEvaluationResponse {
  overallScore: number;
  maxScore: number;
  criteria: CriterionEvaluationResult[];
  verifiedClaims: string[];
  unverifiedClaims: string[];
  missingEvidence: string[];
  inconsistencies: string[];
  summary: string;
  confidence?: ConfidenceLevel;
  evidenceQuality?: string;
}

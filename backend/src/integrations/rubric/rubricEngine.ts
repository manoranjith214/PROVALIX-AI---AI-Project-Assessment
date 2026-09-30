import { RubricCriterionConfig } from './rubricTypes';

/**
 * Standard 7-criteria Rubric Configuration for Project Checker (Total: 100 Marks)
 */
export const PROJECT_CHECKER_RUBRIC: RubricCriterionConfig[] = [
  {
    id: 'problemDefinition',
    name: 'Problem Definition',
    maxScore: 15,
    description: 'Clarity, specificity, and real-world relevance of the defined problem scope and target user beneficiaries.',
    evidenceRequirements: [
      'Articulated problem statement with clear scope',
      'Identified beneficiaries / end users',
      'Realistic constraints and domain background',
    ],
  },
  {
    id: 'innovationNovelty',
    name: 'Innovation & Novelty',
    maxScore: 20,
    description: 'Originality of approach, unique differentiation from existing solutions, and creative application of engineering principles.',
    evidenceRequirements: [
      'Comparative differentiation against current tools',
      'Novel feature set or technical workflow',
      'Creative integration of technology',
    ],
  },
  {
    id: 'technicalImplementation',
    name: 'Technical Implementation',
    maxScore: 20,
    description: 'System architecture, technology stack depth, database schema design, and modular service separation.',
    evidenceRequirements: [
      'Verifiable technology stack and libraries in code or repository',
      'Modular component or service hierarchy',
      'Data flow and architectural models',
    ],
  },
  {
    id: 'functionality',
    name: 'Functionality',
    maxScore: 15,
    description: 'Working capability of proposed features, operational milestones, and tangible end-to-end execution.',
    evidenceRequirements: [
      'Verifiable code logic executing core user workflows',
      'Demonstrated input-to-output transitions',
      'Working demo URL or functional code repository',
    ],
  },
  {
    id: 'codeQuality',
    name: 'Code Quality',
    maxScore: 10,
    description: 'Clean coding standards, proper naming conventions, modularity, defensive error handling, and test coverage.',
    evidenceRequirements: [
      'Separation of concerns and structured files',
      'Error handling and input validation in source code',
      'Unit/integration tests or clear syntax conventions',
    ],
  },
  {
    id: 'documentation',
    name: 'Documentation',
    maxScore: 10,
    description: 'Completeness of setup instructions, README, architectural documentation, and API/interface definitions.',
    evidenceRequirements: [
      'Technical README with environment setup and build steps',
      'Component or API endpoint schemas',
      'Project report or PPT detailing system lifecycle',
    ],
  },
  {
    id: 'overallQuality',
    name: 'Overall Project Quality',
    maxScore: 10,
    description: 'Engineering rigor, execution polish, practical feasibility, and overall coherence across all deliverables.',
    evidenceRequirements: [
      'Cohesive alignment between claims, code, and documentation',
      'Practical utility and deployment feasibility',
      'Presentation rigor and completeness',
    ],
  },
];

/**
 * Standard 5-criteria Rubric Configuration for Classroom AI Analysis (Total: 50 Marks)
 */
export const CLASSROOM_AI_RUBRIC: RubricCriterionConfig[] = [
  {
    id: 'correctnessRelevance',
    name: 'Correctness & Relevance',
    maxScore: 10,
    description: 'Direct alignment with classroom assignment requirements, task prompts, and factual technical accuracy.',
    evidenceRequirements: [
      'Directly addresses all required parts of the assignment prompt',
      'Factually accurate technical statements and calculations',
    ],
  },
  {
    id: 'technicalUnderstanding',
    name: 'Technical Understanding',
    maxScore: 10,
    description: 'Demonstration of domain concepts, underlying computer science principles, and accurate algorithmic intuition.',
    evidenceRequirements: [
      'Sound conceptual explanations without pseudo-technical buzzwords',
      'Correct application of domain methodologies and models',
    ],
  },
  {
    id: 'implementationCode',
    name: 'Implementation & Code',
    maxScore: 10,
    description: 'Executable source code, functional scripts, or architectural proofs of concept that execute the assignment.',
    evidenceRequirements: [
      'Verifiable source code files or repository commits',
      'Working implementation matching the claimed solution',
    ],
  },
  {
    id: 'reasoningAnalysis',
    name: 'Reasoning & Analysis',
    maxScore: 10,
    description: 'Analytical depth, discussion of trade-offs, edge cases, failure states, and performance considerations.',
    evidenceRequirements: [
      'Discussion of trade-offs, constraints, or algorithmic complexities',
      'Identification of limitations or boundary condition handling',
    ],
  },
  {
    id: 'completenessDocumentation',
    name: 'Completeness & Documentation',
    maxScore: 10,
    description: 'Deliverable completeness, clear setup or usage instructions, and well-structured written presentation.',
    evidenceRequirements: [
      'Structured written submission or accompanying documentation',
      'All deliverables present without placeholder omissions',
    ],
  },
];

export class RubricEngine {
  getProjectCheckerRubric(): RubricCriterionConfig[] {
    return PROJECT_CHECKER_RUBRIC;
  }

  getClassroomRubric(): RubricCriterionConfig[] {
    return CLASSROOM_AI_RUBRIC;
  }

  /**
   * Recalculates overall score strictly from the sum of criterion scores.
   * Ensures the final score never deviates from the individual evaluations.
   */
  calculateVerifiedScore(criteria: Array<{ score: number; maxScore: number }>, maxAllowedTotal = 100): number {
    const rawSum = criteria.reduce((sum, c) => sum + (Number(c.score) || 0), 0);
    const rounded = Math.round(rawSum * 10) / 10;
    return Math.min(maxAllowedTotal, Math.max(0, rounded));
  }
}

export const rubricEngine = new RubricEngine();

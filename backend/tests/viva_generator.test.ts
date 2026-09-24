import { defaultAIProvider } from '../src/integrations/ai/MockAIProvider';
import { submitVivaMarksSchema } from '../src/validators/vivaValidator';
import { vivaService } from '../src/services/vivaService';
import { APP_CONSTANTS } from '../src/config/constants';

describe('Viva Question Generator & Manual Grading Tests', () => {
  const sampleSubmission = {
    id: 'sub-viva-101',
    title: 'Healthcare AI Diagnostic Engine',
    category: 'Healthcare & Deep Learning',
    description: 'Real-time chest X-ray disease classification system',
    problemStatement: 'Delayed radiology review times leading to late-stage pneumonia detection',
    proposedSolution: 'Automated CNN-based diagnostic pipeline with FastAPI and React web client',
    objectives: 'Achieve >92% AUC-ROC with under 2 second inference latency',
    innovation: 'Dual-attention ResNet backbone with automated heat-map saliency generation',
    features: 'DICOM parser, multi-label anomaly scoring, automated physician audit trails',
    technologies: JSON.stringify(['PyTorch', 'FastAPI', 'PostgreSQL', 'Docker', 'Redis']),
    programmingLanguages: JSON.stringify(['Python', 'TypeScript']),
    testingApproach: 'PyTest integration tests with synthetic DICOM dataset and 94% code coverage',
    limitations: 'Requires GPU instance for high-throughput inference batches',
    futureEnhancements: 'Multi-modal CT-scan fusion model',
    classroom: {
      id: 'classroom-1',
      ownerId: 'faculty-owner-1',
      evaluators: [{ evaluatorId: 'faculty-evaluator-2' }],
    },
    assignedEvaluatorId: 'faculty-evaluator-3',
    submitterId: 'student-author-1',
    team: {
      id: 'team-alpha',
      members: [{ userId: 'student-author-1' }, { userId: 'student-teammate-2' }],
    },
  };

  test('AI generates exactly 5 project-specific viva questions matching the 5 mandatory categories', async () => {
    const questions = await defaultAIProvider.generateVivaQuestions(sampleSubmission);

    expect(questions).toBeDefined();
    expect(questions.length).toBe(5);

    // Verify categories match exactly the 5 required categories
    const generatedCategories = questions.map((q) => q.category);
    expect(generatedCategories).toEqual([
      'Problem Understanding',
      'Technical Implementation',
      'Technology / Algorithm Choice',
      'Feature / Internal Working',
      'Scenario / Challenge / Failure Handling',
    ]);

    // Verify each question has maxScore = 5 and question numbers 1..5
    questions.forEach((q, idx) => {
      expect(q.questionNumber).toBe(idx + 1);
      expect(q.maxScore).toBe(5);
      expect(typeof q.questionText).toBe('string');
      expect(q.questionText.length).toBeGreaterThan(20);
    });

    // Verify total possible viva marks = 25
    const totalMax = questions.reduce((sum, q) => sum + q.maxScore, 0);
    expect(totalMax).toBe(25);
  });

  test('Generated questions dynamically reference project title, technologies, and features', async () => {
    const questions = await defaultAIProvider.generateVivaQuestions(sampleSubmission);

    const fullText = questions.map((q) => q.questionText).join(' ');

    // Must reference title or problem statement or technologies
    expect(
      fullText.includes(sampleSubmission.title) ||
      fullText.includes('pneumonia') ||
      fullText.includes('radiology') ||
      fullText.includes('Healthcare')
    ).toBe(true);

    // Must reference technologies or programming languages
    expect(
      fullText.includes('PyTorch') ||
      fullText.includes('FastAPI') ||
      fullText.includes('Python') ||
      fullText.includes('ResNet')
    ).toBe(true);
  });

  describe('Viva Marks Validation (Faculty Manual Awarding)', () => {
    test('Accepts valid 5 question grades with scores between 0 and 5 and total <= 25', () => {
      const validPayload = {
        pptDemoScore: 22,
        vivaQuestions: [
          { questionNumber: 1, questionText: 'Q1 text', category: 'Problem Understanding', score: 4.5, feedback: 'Great' },
          { questionNumber: 2, questionText: 'Q2 text', category: 'Technical Implementation', score: 5.0, feedback: 'Flawless' },
          { questionNumber: 3, questionText: 'Q3 text', category: 'Technology / Algorithm Choice', score: 4.0, feedback: 'Solid' },
          { questionNumber: 4, questionText: 'Q4 text', category: 'Feature / Internal Working', score: 3.5, feedback: 'Good' },
          { questionNumber: 5, questionText: 'Q5 text', category: 'Scenario / Challenge / Failure Handling', score: 4.0, feedback: 'Good' },
        ],
        status: 'Completed',
        feedback: 'Overall candidate demonstrated rigorous technical command.',
      };

      const result = submitVivaMarksSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        const sum = result.data.vivaQuestions.reduce((acc, q) => acc + q.score, 0);
        expect(sum).toBe(21.0);
        expect(sum).toBeLessThanOrEqual(25);
      }
    });

    test('Rejects if question count is not exactly 5', () => {
      const invalidCount = {
        vivaQuestions: [
          { questionNumber: 1, questionText: 'Q1', score: 4 },
          { questionNumber: 2, questionText: 'Q2', score: 5 },
          { questionNumber: 3, questionText: 'Q3', score: 4 },
        ],
        feedback: 'Too few questions',
      };

      const result = submitVivaMarksSchema.safeParse(invalidCount);
      expect(result.success).toBe(false);
    });

    test('Rejects if any question score exceeds 5 marks', () => {
      const invalidScore = {
        vivaQuestions: [
          { questionNumber: 1, questionText: 'Q1', score: 6.0 }, // Exceeds 5
          { questionNumber: 2, questionText: 'Q2', score: 4.0 },
          { questionNumber: 3, questionText: 'Q3', score: 4.0 },
          { questionNumber: 4, questionText: 'Q4', score: 4.0 },
          { questionNumber: 5, questionText: 'Q5', score: 4.0 },
        ],
        feedback: 'Testing single question overflow',
      };

      const result = submitVivaMarksSchema.safeParse(invalidScore);
      expect(result.success).toBe(false);
    });

    test('Rejects if total viva marks exceed 25', () => {
      const invalidTotal = {
        vivaQuestions: [
          { questionNumber: 1, questionText: 'Q1', score: 5.0 },
          { questionNumber: 2, questionText: 'Q2', score: 5.0 },
          { questionNumber: 3, questionText: 'Q3', score: 5.0 },
          { questionNumber: 4, questionText: 'Q4', score: 5.0 },
          { questionNumber: 5, questionText: 'Q5', score: 5.1 }, // Sum = 25.1
        ],
        feedback: 'Over max marks',
      };

      const result = submitVivaMarksSchema.safeParse(invalidTotal);
      expect(result.success).toBe(false);
    });

    test('Requires a reason when status is Incomplete or Absent', () => {
      const missingReason = {
        vivaQuestions: [
          { questionNumber: 1, questionText: 'Q1', score: 0 },
          { questionNumber: 2, questionText: 'Q2', score: 0 },
          { questionNumber: 3, questionText: 'Q3', score: 0 },
          { questionNumber: 4, questionText: 'Q4', score: 0 },
          { questionNumber: 5, questionText: 'Q5', score: 0 },
        ],
        status: 'Absent',
        reason: '', // Empty reason
        feedback: 'Student did not appear',
      };

      const result = submitVivaMarksSchema.safeParse(missingReason);
      expect(result.success).toBe(false);
    });
  });

  describe('Authorization and Access Control', () => {
    test('Classroom owner, assigned evaluator, classroom evaluator, and admin are authorized evaluators', () => {
      // Classroom owner
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'faculty-owner-1')).toBe(true);

      // Assigned evaluator
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'faculty-evaluator-3')).toBe(true);

      // Classroom co-evaluator
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'faculty-evaluator-2')).toBe(true);

      // System Admin
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'admin-999', 'admin')).toBe(true);

      // Submitter is NOT an authorized evaluator
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'student-author-1')).toBe(false);

      // Random user is NOT an authorized evaluator
      expect(vivaService.isEvaluatorOrOwner(sampleSubmission, 'random-stranger')).toBe(false);
    });

    test('Author and team members are recognized as students of the submission', () => {
      // Submitter
      expect(vivaService.isStudentOfSubmission(sampleSubmission, 'student-author-1')).toBe(true);

      // Teammate
      expect(vivaService.isStudentOfSubmission(sampleSubmission, 'student-teammate-2')).toBe(true);

      // Unrelated student
      expect(vivaService.isStudentOfSubmission(sampleSubmission, 'other-student-456')).toBe(false);
    });
  });

  describe('Final Authoritative Classroom Score Formula', () => {
    test('Integrates AI (/50) + PPT/Demo (/25) + Viva (/25) to reach authoritative total (/100)', () => {
      const aiScore = 42.5;        // Out of 50
      const pptDemoScore = 21.0;   // Out of 25
      const vivaScores = [4.5, 4.0, 5.0, 4.0, 4.5]; // Sum = 22.0 / 25

      const vivaTotal = vivaScores.reduce((acc, s) => acc + s, 0);
      expect(vivaTotal).toBe(22.0);

      const totalFacultyScore = pptDemoScore + vivaTotal; // 43.0 / 50
      expect(totalFacultyScore).toBe(43.0);

      const finalTotalScore = aiScore + totalFacultyScore; // 85.5 / 100
      expect(finalTotalScore).toBe(85.5);
      expect(finalTotalScore).toBeLessThanOrEqual(APP_CONSTANTS.SCORES.CLASSROOM.TOTAL_MAX);
    });
  });
});

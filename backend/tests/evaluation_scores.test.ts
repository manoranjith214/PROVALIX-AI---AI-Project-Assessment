import { defaultAIProvider } from '../src/integrations/ai/MockAIProvider';
import { defaultPlagiarismProvider } from '../src/integrations/plagiarism/MockPlagiarismProvider';
import { APP_CONSTANTS } from '../src/config/constants';

describe('Authoritative Evaluation Scoring Logic Tests', () => {
  test('Project Checker evaluates all 7 criteria matching exact maximums totaling 100', async () => {
    const mockProject = {
      title: 'Autonomous Navigation Robot',
      problemStatement: 'GPS degradation indoors',
      innovation: 'Visual SLAM with edge vision',
      technologies: ['ROS2', 'PyTorch', 'C++'],
      githubUrl: 'https://github.com/test/robot',
      liveDemoUrl: 'https://test-demo.com',
      description: 'Full autonomous stack',
    };

    const evaluation = await defaultAIProvider.evaluateProject(mockProject);

    expect(evaluation.overallScore).toBeLessThanOrEqual(APP_CONSTANTS.SCORES.PROJECT_CHECKER_MAX);

    // Verify each criterion max score aligns with specifications
    expect(evaluation.criteria.problemDefinition.maxScore).toBe(15);
    expect(evaluation.criteria.innovationNovelty.maxScore).toBe(20);
    expect(evaluation.criteria.technicalImplementation.maxScore).toBe(20);
    expect(evaluation.criteria.functionality.maxScore).toBe(15);
    expect(evaluation.criteria.codeQuality.maxScore).toBe(10);
    expect(evaluation.criteria.documentation.maxScore).toBe(10);
    expect(evaluation.criteria.overallQuality.maxScore).toBe(10);

    const sumMax =
      evaluation.criteria.problemDefinition.maxScore +
      evaluation.criteria.innovationNovelty.maxScore +
      evaluation.criteria.technicalImplementation.maxScore +
      evaluation.criteria.functionality.maxScore +
      evaluation.criteria.codeQuality.maxScore +
      evaluation.criteria.documentation.maxScore +
      evaluation.criteria.overallQuality.maxScore;

    expect(sumMax).toBe(100);

    // Verify obtained scores do not exceed their individual max limits
    expect(evaluation.criteria.problemDefinition.obtainedScore).toBeLessThanOrEqual(15);
    expect(evaluation.criteria.innovationNovelty.obtainedScore).toBeLessThanOrEqual(20);
    expect(evaluation.criteria.technicalImplementation.obtainedScore).toBeLessThanOrEqual(20);
    expect(evaluation.criteria.functionality.obtainedScore).toBeLessThanOrEqual(15);
    expect(evaluation.criteria.codeQuality.obtainedScore).toBeLessThanOrEqual(10);
    expect(evaluation.criteria.documentation.obtainedScore).toBeLessThanOrEqual(10);
    expect(evaluation.criteria.overallQuality.obtainedScore).toBeLessThanOrEqual(10);
  });

  test('Classroom AI evaluation score is out of 50 and incorporates plagiarism deduction', async () => {
    const mockSubmission = {
      title: 'Drone Control System',
      description: 'Flight firmware',
      githubUrl: 'https://github.com/drone/firmware',
    };

    const plagiarismData = {
      codeSimilarity: 25.0,
      reportSimilarity: 25.0,
      deduction: 5.0,
    };

    const aiEval = await defaultAIProvider.evaluateClassroomSubmission(mockSubmission, plagiarismData);

    expect(aiEval.rawScore).toBeLessThanOrEqual(50);
    expect(aiEval.deduction).toBe(5.0);
    expect(aiEval.finalScore).toBe(aiEval.rawScore - aiEval.deduction);
    expect(aiEval.finalScore).toBeLessThanOrEqual(50);
  });

  test('Viva evaluation must comprise 5 questions x 5 marks = 25 max', () => {
    const vivaScores = [5, 4.5, 5, 4, 4.5];
    expect(vivaScores.length).toBe(APP_CONSTANTS.SCORES.CLASSROOM.VIVA_QUESTION_COUNT);

    const vivaTotal = vivaScores.reduce((a, b) => a + b, 0);
    expect(vivaTotal).toBeLessThanOrEqual(APP_CONSTANTS.SCORES.CLASSROOM.VIVA_MAX);
    expect(vivaTotal).toBe(23);
  });

  test('Final Classroom Score backend formula: AI (/50) + PPT/Demo (/25) + Viva (/25) = Final (/100)', () => {
    const aiScore = 44.5; // /50
    const pptDemoScore = 23.0; // /25
    const vivaScore = 25.0; // /25

    const finalScore = aiScore + pptDemoScore + vivaScore;
    expect(finalScore).toBe(92.5);
    expect(finalScore).toBeLessThanOrEqual(100);
  });

  test('Plagiarism analysis provides similarity percentages and deduction without being separate scoring category', async () => {
    const result = await defaultPlagiarismProvider.analyzeFullSubmission();

    expect(result.codeSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.reportSimilarity).toBeGreaterThanOrEqual(0);
    expect(result.overallSimilarity).toBeGreaterThanOrEqual(0);
    expect(['Low', 'Moderate', 'High']).toContain(result.status);
    expect(typeof result.deduction).toBe('number');
  });
});

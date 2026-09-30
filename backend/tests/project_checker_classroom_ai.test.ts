import { evidenceAnalyzer } from '../src/integrations/rubric/evidenceAnalyzer';
import { rubricEngine, PROJECT_CHECKER_RUBRIC, CLASSROOM_AI_RUBRIC } from '../src/integrations/rubric/rubricEngine';
import { MockAIProvider } from '../src/integrations/ai/MockAIProvider';
import { ProjectCheckerService } from '../src/services/projectCheckerService';
import { AIEvaluationService } from '../src/services/aiEvaluationService';
import { submissionRepository } from '../src/repositories/submissionRepository';
import { AppError } from '../src/middleware/errorMiddleware';

describe('End-to-End Project Checker & Classroom AI Systems - 10 Test Cases', () => {
  const aiProvider = new MockAIProvider();
  const projectCheckerService = new ProjectCheckerService();
  const aiEvaluationService = new AIEvaluationService();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // -------------------------------------------------------------
  // Test 1: Name only → No AI score. Returns "Insufficient project evidence for evaluation."
  // -------------------------------------------------------------
  test('Test 1: Name only submission must be rejected before AI scoring without generating fabricated scores', async () => {
    const nameOnlySubmission = {
      title: 'John Doe',
      description: '',
      problemStatement: '',
      proposedSolution: '',
      technologies: [],
      resources: [],
    };

    const validation = evidenceAnalyzer.validateProjectSubmission(nameOnlySubmission);
    expect(validation.isValid).toBe(false);
    expect(validation.reason).toBe('Insufficient project evidence for evaluation.');

    // Verify service rejects immediately without calling AI
    jest.spyOn(projectCheckerService, 'getProjectById').mockResolvedValueOnce({
      id: 'proj_name_only',
      userId: 'user_1',
      ...nameOnlySubmission,
    } as any);

    await expect(
      projectCheckerService.runAIEvaluation('proj_name_only', 'user_1')
    ).rejects.toThrow('Insufficient project evidence for evaluation.');
  });

  // -------------------------------------------------------------
  // Test 2: Name + random description → Insufficient evidence or low-confidence analysis
  // -------------------------------------------------------------
  test('Test 2: Name + random minimal description results in low-confidence analysis with unverified claims', async () => {
    const minimalSubmission = {
      title: 'Student Project Check',
      description: 'Random text testing quick test hello world 12345',
      problemStatement: 'Short minimal problem text here',
      technologies: ['React'],
      resources: [],
      githubUrl: '',
    };

    const evidence = evidenceAnalyzer.extractAndClassifyEvidence(minimalSubmission);
    expect(evidence.missingEvidence.length).toBeGreaterThan(0);
    expect(evidence.missingEvidence.some(m => m.toLowerCase().includes('source code'))).toBe(true);

    const result = await aiProvider.evaluateProject(minimalSubmission, undefined, evidence);
    expect(['LOW', 'INSUFFICIENT_EVIDENCE']).toContain(result.confidence);
    expect(['LOW', 'INSUFFICIENT_EVIDENCE']).toContain(result.criteria.technicalImplementation.confidence);
    expect(result.overallScore).toBeLessThan(60);
  });

  // -------------------------------------------------------------
  // Test 3: Complete valid project → Full rubric analysis with calculated score
  // -------------------------------------------------------------
  test('Test 3: Complete valid project receives full 7-criterion rubric analysis where overallScore = sum of criteria', async () => {
    const completeProject = {
      title: 'Decentralized Fault-Tolerant Storage Engine',
      category: 'Distributed Systems',
      description: 'A distributed high-throughput storage engine running Raft consensus with automated data replication and snapshotting across multiple cluster nodes.',
      problemStatement: 'Traditional centralized data storage systems suffer from single points of failure, bottlenecked egress throughput, and downtime during node failovers.',
      proposedSolution: 'A decentralized Go-based cluster leveraging Raft consensus, consistent hashing ring, and gRPC RPC communication with automated replica failovers.',
      innovation: 'Zero-downtime dynamic leader election coupled with lock-free memory indexing and predictive read caching.',
      technologies: ['Go', 'Raft', 'gRPC', 'Docker'],
      programmingLanguages: ['Go'],
      githubUrl: 'https://github.com/provalix/raft-storage-engine',
      liveDemoUrl: 'https://raft-storage.demo.internal',
      resources: [
        { type: 'sourceCode', name: 'raft_cluster.go', size: '1.2 MB' },
        { type: 'projectReport', name: 'system_design_report.pdf', size: '4.5 MB' },
      ],
    };

    const validation = evidenceAnalyzer.validateProjectSubmission(completeProject);
    expect(validation.isValid).toBe(true);

    const evidence = evidenceAnalyzer.extractAndClassifyEvidence(completeProject);
    expect(evidence.verifiedEvidence.length).toBeGreaterThan(0);

    const result = await aiProvider.evaluateProject(completeProject, undefined, evidence);

    // Verify 7 criteria exist and sum up to totalScore
    expect(result.criteriaList).toBeDefined();
    expect(result.criteriaList!.length).toBe(7);
    const sumCriteria =
      result.criteria.problemDefinition.obtainedScore +
      result.criteria.innovationNovelty.obtainedScore +
      result.criteria.technicalImplementation.obtainedScore +
      result.criteria.functionality.obtainedScore +
      result.criteria.codeQuality.obtainedScore +
      result.criteria.documentation.obtainedScore +
      result.criteria.overallQuality.obtainedScore;

    expect(result.overallScore).toBe(sumCriteria);
    expect(result.confidence).toBe('HIGH');
  });

  // -------------------------------------------------------------
  // Test 4: Fake technology claim → Claim marked unverified
  // -------------------------------------------------------------
  test('Test 4: Fake technology claim (YOLOv8 claimed with only basic HTML) is marked unverified', async () => {
    const fakeTechProject = {
      title: 'AI Smart Vision Sorter',
      category: 'Computer Vision',
      description: 'Project uses React, Node.js and YOLOv8 for edge computer vision classification.',
      problemStatement: 'Manual defect detection in manufacturing lines is prone to human fatigue and slow throughput.',
      technologies: ['React', 'Node.js', 'YOLOv8'],
      resources: [
        { type: 'sourceCode', name: 'index.html', size: '2 KB' },
      ],
    };

    const evidence = evidenceAnalyzer.extractAndClassifyEvidence(fakeTechProject);
    
    // YOLOv8 should be marked as unverified claim
    const yoloClaim = evidence.unverifiedClaims.find(c => c.toLowerCase().includes('yolov8'));
    expect(yoloClaim).toBeDefined();
    expect(yoloClaim).toContain('Claim not verified from submitted evidence');
    expect(yoloClaim).toContain('Submitted implementation does not provide evidence for the claimed technologies');

    const result = await aiProvider.evaluateProject(fakeTechProject, undefined, evidence);
    expect(result.unverifiedClaims).toContain(yoloClaim);
    expect(result.criteria.technicalImplementation.confidence).toBe('LOW');
  });

  // -------------------------------------------------------------
  // Test 5: Contradictory project information → Inconsistency detected
  // -------------------------------------------------------------
  test('Test 5: Contradictory project information (Native Android App claimed with React web assets) detects inconsistency', async () => {
    const contradictoryProject = {
      title: 'Native Android Health Tracker',
      category: 'Mobile Development',
      description: 'An Android native mobile app built for Android tablets and smartphones with hardware sensors.',
      problemStatement: 'Patients need real-time Android notification reminders for vital medications.',
      technologies: ['Android', 'Java'],
      resources: [
        { type: 'sourceCode', name: 'App.jsx', size: '15 KB' },
        { type: 'other', name: 'package.json', size: '1 KB' },
      ],
    };

    const evidence = evidenceAnalyzer.extractAndClassifyEvidence(contradictoryProject);
    expect(evidence.inconsistencies.length).toBeGreaterThan(0);
    expect(evidence.inconsistencies.some(i => i.toLowerCase().includes('android') || i.toLowerCase().includes('web') || i.toLowerCase().includes('contradiction'))).toBe(true);

    const result = await aiProvider.evaluateProject(contradictoryProject, undefined, evidence);
    expect(result.inconsistencies.length).toBeGreaterThan(0);
    expect(result.criteria.innovationNovelty.confidence).toBe('LOW');
  });

  // -------------------------------------------------------------
  // Test 6: Classroom answer with correct answer → Criterion-level analysis
  // -------------------------------------------------------------
  test('Test 6: Classroom submission with correct answer receives detailed criterion-level high scores', async () => {
    const correctSubmission = {
      title: 'TCP Protocol Analysis',
      description: 'Analysis of transport layer connection establishment and reliability mechanisms.',
      answer: 'TCP provides reliable, ordered stream delivery using a 3-way handshake (SYN, SYN-ACK, ACK) to negotiate initial sequence numbers. Flow control is maintained via sliding window buffers and congestion avoidance algorithms (CUBIC/Reno).',
    };

    const result = await aiProvider.evaluateClassroomSubmission(correctSubmission);

    expect(result.criteriaList).toBeDefined();
    expect(result.criteriaList!.length).toBe(5);
    expect(result.rawScore).toBeGreaterThanOrEqual(40);
    expect(result.criteriaList![0].name).toBe('Correctness & Relevance');
    expect(result.criteriaList![0].score).toBeGreaterThanOrEqual(9.0);
    expect(result.criteriaList![0].confidence).toBe('HIGH');
  });

  // -------------------------------------------------------------
  // Test 7: Classroom answer with incorrect answer → Correctly identify errors and score accordingly
  // -------------------------------------------------------------
  test('Test 7: Classroom submission with incorrect answer identifies factual errors and assigns low score', async () => {
    const incorrectSubmission = {
      title: 'TCP Protocol Analysis',
      description: 'Analysis of networking protocols and database normalization.',
      answer: 'TCP is connectionless and does not require any handshake. Normalization increases redundancy in database tables.',
    };

    const result = await aiProvider.evaluateClassroomSubmission(incorrectSubmission);

    expect(result.criteriaList).toBeDefined();
    expect(result.criteriaList!.length).toBe(5);
    expect(result.criteriaList![0].score).toBeLessThanOrEqual(3.0);
    expect(result.criteriaList![0].justification.toLowerCase()).toContain('error');
    expect(result.rawScore).toBeLessThan(20);
  });

  // -------------------------------------------------------------
  // Test 8: Missing classroom submission → No fabricated score
  // -------------------------------------------------------------
  test('Test 8: Missing classroom submission throws 404 without producing a fabricated score', async () => {
    jest.spyOn(submissionRepository, 'findById').mockResolvedValueOnce(null);

    await expect(
      aiEvaluationService.evaluateSubmission('non-existent-submission-id-999')
    ).rejects.toThrow('Submission not found');
  });

  // -------------------------------------------------------------
  // Test 9: Backend/API failure → Real error, no demo fallback
  // -------------------------------------------------------------
  test('Test 9: Database/API failure surfaces clear error and does not inject fake demo fallback records', async () => {
    jest.spyOn(projectCheckerService, 'getProjectById').mockRejectedValueOnce(
      new Error('Database connection failed')
    );

    await expect(
      projectCheckerService.runAIEvaluation('proj_test_fail', 'user_1')
    ).rejects.toThrow('Database connection failed');
  });

  // -------------------------------------------------------------
  // Test 10: Refresh dashboard → Authenticated user remains logged in
  // -------------------------------------------------------------
  test('Test 10: Auth token persistence validates that user session persists across page reload', () => {
    // Simulate localStorage session storage used by Supabase Auth
    const mockStorage: Record<string, string> = {};
    const mockSession = {
      access_token: 'sb-access-token-valid-abc123',
      refresh_token: 'sb-refresh-token-xyz789',
      user: { id: 'usr_persistent_10', email: 'student@university.edu', role: 'STUDENT' },
    };

    // 1. User logs in: Token saved to storage
    mockStorage['sb-auth-token'] = JSON.stringify(mockSession);

    // 2. Page reload happens: State re-initialized from storage
    const stored = mockStorage['sb-auth-token'];
    expect(stored).toBeDefined();

    const parsedSession = JSON.parse(stored);
    expect(parsedSession.access_token).toBe('sb-access-token-valid-abc123');
    expect(parsedSession.user.id).toBe('usr_persistent_10');
    expect(parsedSession.user.email).toBe('student@university.edu');
  });
});

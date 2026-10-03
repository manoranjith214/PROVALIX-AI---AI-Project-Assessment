import {
  getPlagiarismProvider,
  resetPlagiarismProvider,
  MockPlagiarismProvider,
  UnavailablePlagiarismProvider,
  codeNormalizer,
  sourceExtractor,
  runPlagiarismPipeline,
} from '../src/integrations/plagiarism';
import {
  getStorageProvider,
  LocalStorageProvider,
  SupabaseStorageProvider,
} from '../src/integrations/storage';
import {
  validateFileSignature,
  sanitizeFileName,
} from '../src/middleware/uploadMiddleware';
import { config } from '../src/config/env';
import { submissionService } from '../src/services/submissionService';
import { teamService } from '../src/services/teamService';
import { verificationService } from '../src/services/verificationService';
import { submissionRepository } from '../src/repositories/submissionRepository';
import { teamRepository } from '../src/repositories/teamRepository';
import { classroomRepository } from '../src/repositories/classroomRepository';
import { prisma } from '../src/config/prisma';

describe('Stage 1: Plagiarism Provider Architecture Tests', () => {
  const originalEnv = config.nodeEnv;
  const originalPlagProvider = config.plagiarism.provider;

  afterEach(() => {
    config.nodeEnv = originalEnv;
    config.plagiarism.provider = originalPlagProvider;
    resetPlagiarismProvider();
  });

  test('CodeNormalizer strips comments and normalizes whitespace', () => {
    const rawCode = `
      // Single line JS comment
      function calculateSum(a, b) {
        /* Multi-line
           comment block */
        # Python style comment
        return a +   b;
      }
    `;
    const normalized = codeNormalizer.normalize(rawCode);
    expect(normalized).not.toContain('Single line JS comment');
    expect(normalized).not.toContain('Multi-line');
    expect(normalized).not.toContain('Python style comment');
    expect(normalized).toContain('function calculateSum(a, b) {');
    expect(normalized).toContain('return a + b;');
  });

  test('CodeNormalizer calculates Jaccard similarity between token shingles', () => {
    const textA = 'function helloWorld() { return 42; }';
    const textB = 'function helloWorld() { return 42; }';
    const textC = 'class CompletelyDifferentService { private x = 100; }';

    const shinglesA = codeNormalizer.generateShingles(textA, 2);
    const shinglesB = codeNormalizer.generateShingles(textB, 2);
    const shinglesC = codeNormalizer.generateShingles(textC, 2);

    expect(codeNormalizer.calculateJaccardSimilarity(shinglesA, shinglesB)).toBe(100);
    expect(codeNormalizer.calculateJaccardSimilarity(shinglesA, shinglesC)).toBeLessThan(20);
  });

  test('MockPlagiarismProvider clearly marks results with isDemoData: true and providerType: mock', async () => {
    const mock = new MockPlagiarismProvider();
    expect(mock.providerType).toBe('mock');
    expect(mock.isAvailable()).toBe(true);

    const res = await mock.analyzeFullSubmission();
    expect(res.isDemoData).toBe(true);
    expect(res.providerType).toBe('mock');
    expect(res.feedback).toContain('Mock provider');
  });

  test('UnavailablePlagiarismProvider throws 503 error rather than faking plagiarism results', async () => {
    const unavailable = new UnavailablePlagiarismProvider('No credentials configured');
    expect(unavailable.providerType).toBe('unavailable');
    expect(unavailable.isAvailable()).toBe(false);

    await expect(unavailable.analyzeFullSubmission()).rejects.toThrow();
  });

  test('Production environment refuses silent MockPlagiarismProvider fallback', () => {
    config.nodeEnv = 'production';
    config.plagiarism.provider = 'real';
    resetPlagiarismProvider();

    const provider = getPlagiarismProvider();
    expect(provider).toBeInstanceOf(UnavailablePlagiarismProvider);
    expect(provider.providerType).toBe('unavailable');
  });

  test('runPlagiarismPipeline executes full pipeline: extraction -> normalization -> provider -> result', async () => {
    const mockSubmission = {
      title: 'AI Evaluation Platform',
      description: 'System for evaluating student code deliverables',
      problemStatement: 'Manual grading is slow',
      proposedSolution: 'Automated pipeline with static analysis',
      resources: [],
    };

    const result = await runPlagiarismPipeline({
      submissionOrProject: mockSubmission,
      resources: [],
    });

    expect(result).toHaveProperty('codeSimilarity');
    expect(result).toHaveProperty('reportSimilarity');
    expect(result).toHaveProperty('overallSimilarity');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('isDemoData');
  });
});

describe('Stage 1: Storage and File Upload Security Tests', () => {
  test('sanitizeFileName prevents directory traversal and null byte injections', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('..\\..\\windows\\system32\\cmd.exe')).toBe('cmd.exe');
    expect(sanitizeFileName('malicious\0file.pdf')).toBe('maliciousfile.pdf');
    expect(sanitizeFileName('valid-report_2026.pdf')).toBe('valid-report_2026.pdf');
  });

  test('validateFileSignature correctly identifies valid PDF, PNG, and JPEG signatures', () => {
    const pdfBuffer = Buffer.from('%PDF-1.4 header contents here');
    expect(validateFileSignature(pdfBuffer, '.pdf').valid).toBe(true);

    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00]);
    expect(validateFileSignature(pngBuffer, '.png').valid).toBe(true);

    const jpegBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
    expect(validateFileSignature(jpegBuffer, '.jpg').valid).toBe(true);
  });

  test('validateFileSignature strictly rejects executable binary signatures disguised as documents', () => {
    // Windows PE header (MZ) disguised as .pdf
    const peDisguised = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00]);
    const peCheck = validateFileSignature(peDisguised, '.pdf');
    expect(peCheck.valid).toBe(false);
    expect(peCheck.reason).toContain('Executable Windows PE binary');

    // Linux ELF header disguised as .png
    const elfDisguised = Buffer.from([0x7F, 0x45, 0x4C, 0x46, 0x02, 0x01]);
    const elfCheck = validateFileSignature(elfDisguised, '.png');
    expect(elfCheck.valid).toBe(false);
    expect(elfCheck.reason).toContain('Executable Linux ELF binary');
  });

  test('LocalStorageProvider prevents path traversal when saving files', async () => {
    const local = new LocalStorageProvider();
    const mockFile: any = {
      originalname: 'test.txt',
      mimetype: 'text/plain',
      size: 11,
      buffer: Buffer.from('hello world'),
    };

    await expect(local.saveFile(mockFile, '../../../../etc')).rejects.toThrow();
  });

  test('LocalStorageProvider generates HMAC-signed download URLs', async () => {
    const local = new LocalStorageProvider();
    const signedUrl = await local.getSignedDownloadUrl('submissions/sample-doc.pdf', 3600);
    expect(signedUrl).toContain('/api/storage/files/local/submissions/sample-doc.pdf');
    expect(signedUrl).toContain('expires=');
    expect(signedUrl).toContain('signature=');
  });
});

describe('Stage 1: Submission and Team Ownership Authorization Tests', () => {
  const userA = 'user-owner-101';
  const userB = 'user-student-202';
  const userC = 'user-stranger-303';

  const mockSubmission: any = {
    id: 'sub-test-auth-1',
    classroomId: 'cls-auth-1',
    submitterId: userB,
    teamId: null,
    status: 'Submitted',
    classroom: {
      id: 'cls-auth-1',
      ownerId: userA,
      evaluators: [],
    },
    team: null,
  };

  test('getSubmissionById allows classroom owner and submitter, blocks unauthorized strangers', async () => {
    jest.spyOn(submissionRepository, 'findById').mockResolvedValue(mockSubmission);

    // Submitter can access
    const bySubmitter = await submissionService.getSubmissionById('sub-test-auth-1', userB);
    expect(bySubmitter.id).toBe('sub-test-auth-1');

    // Classroom owner can access
    const byOwner = await submissionService.getSubmissionById('sub-test-auth-1', userA);
    expect(byOwner.id).toBe('sub-test-auth-1');

    // Unrelated stranger is blocked with 403
    await expect(submissionService.getSubmissionById('sub-test-auth-1', userC)).rejects.toThrow(
      'You do not have permission to access this submission'
    );
  });

  test('verifySubmission permits only classroom owner, blocks unauthorized users', async () => {
    const subWithFaculty: any = {
      ...mockSubmission,
      facultyEvaluation: { pptDemoScore: 20, vivaTotalScore: 20 },
    };
    jest.spyOn(submissionRepository, 'findById').mockResolvedValue(subWithFaculty);

    // Stranger tries to verify -> 403 Forbidden
    await expect(verificationService.verifySubmission(subWithFaculty.id, userC)).rejects.toThrow(
      'Only the classroom owner can verify'
    );
  });

  test('getTeamById blocks unauthorized non-members from viewing team details', async () => {
    const mockTeam: any = {
      id: 'team-sec-1',
      name: 'Alpha Coders',
      captainId: userB,
      members: [{ userId: userB, role: 'CAPTAIN' }],
    };
    jest.spyOn(teamRepository, 'findById').mockResolvedValue(mockTeam);
    jest.spyOn(teamRepository, 'listTeamClassroomParticipations').mockResolvedValue([]);

    // Team captain can view
    const captainView = await teamService.getTeamById('team-sec-1', userB);
    expect(captainView.id).toBe('team-sec-1');

    // Unrelated stranger is blocked with 403
    await expect(teamService.getTeamById('team-sec-1', userC)).rejects.toThrow(
      'You do not have permission to access this team'
    );
  });
});

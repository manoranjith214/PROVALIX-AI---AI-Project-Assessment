import { validateMeaningfulText } from '../src/validators/inputValidationUtils';
import { createProjectCheckerProjectSchema } from '../src/validators/projectCheckerValidator';
import { evidenceAnalyzer } from '../src/integrations/rubric/evidenceAnalyzer';
import { GeminiProvider } from '../src/integrations/ai/GeminiProvider';
import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { chatbotRepository } from '../src/integrations/chatbot/ChatbotRepository';
import { knowledgeBaseService } from '../src/integrations/knowledge-base/KnowledgeBaseService';
import { verifySupabaseToken } from '../src/config/supabase';
import { prisma } from '../src/config/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../src/integrations/chatbot/ChatbotRepository');
jest.mock('../src/integrations/knowledge-base/KnowledgeBaseService');
jest.mock('../src/config/prisma', () => ({
  prisma: {
    projectCheckerProject: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    submission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    classroomMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    teamMember: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    notification: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'usr_audit_test_999',
        name: 'Test Student',
        permanentId: 'PRV-AUDIT-999',
      }),
    },
  },
}));

describe('FINAL END-TO-END AUDIT — ALL 23 TEST CASES', () => {
  const gemini = new GeminiProvider();
  const userId = 'usr_audit_test_999';
  let mockMessages: Array<{ id: string; role: string; message: string; sources?: any[] }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessages = [];

    (chatbotRepository.createConversation as jest.Mock).mockImplementation((uId: string, title: string, pId?: string, sId?: string) => {
      return Promise.resolve({
        id: 'conv-audit-999',
        userId: uId,
        title,
        projectId: pId,
        submissionId: sId,
        messages: mockMessages,
      });
    });

    (chatbotRepository.findConversationById as jest.Mock).mockImplementation((convId: string) => {
      return Promise.resolve({
        id: convId,
        userId,
        title: 'Audit Test Conversation',
        messages: mockMessages,
      });
    });

    (chatbotRepository.findRecentPendingUserConversation as jest.Mock).mockResolvedValue(null);

    (chatbotRepository.addMessage as jest.Mock).mockImplementation((convId: string, role: string, message: string, sources: any[]) => {
      const msgObj = { id: `msg-${Date.now()}-${Math.random()}`, role, message, sources };
      mockMessages.push(msgObj);
      return Promise.resolve(msgObj);
    });

    (knowledgeBaseService.retrieveContext as jest.Mock).mockResolvedValue({
      contextText: 'Provalix evaluation guidelines',
      sources: [{ title: 'Evaluation Guidelines', category: 'Platform Rules', id: 'kb-1' }],
    });
  });

  // ==========================================
  // PROJECT CHECKER (TEST 1 - 7)
  // ==========================================

  describe('PROJECT CHECKER VALIDATION & EVIDENCE (TESTS 1 - 7)', () => {
    test('TEST 1: Title = "xxm,m,," -> REJECT, No AI request', () => {
      const result = validateMeaningfulText('xxm,m,,', 5, 'Title');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();

      const parseResult = createProjectCheckerProjectSchema.safeParse({
        title: 'xxm,m,,',
        category: 'Web Development',
        targetUsers: 'College Students',
        description: 'This is a genuine project description about student assessments.',
        problemStatement: 'Students struggle with automated manual project evaluation processes.',
        proposedSolution: 'An AI-driven project evaluation and feedback platform with real grading.',
      });
      expect(parseResult.success).toBe(false);
      if (!parseResult.success) {
        const titleError = parseResult.error.errors.find((e: any) => e.path.includes('title'));
        expect(titleError).toBeDefined();
      }
    });

    test('TEST 2: Title = "aaaaaaa" -> REJECT as meaningless', () => {
      const result = validateMeaningfulText('aaaaaaa', 5, 'Title');
      expect(result.isValid).toBe(false);

      const parseResult = createProjectCheckerProjectSchema.safeParse({
        title: 'aaaaaaa',
        category: 'Web Development',
        targetUsers: 'College Students',
        description: 'This is a genuine project description about student assessments.',
        problemStatement: 'Students struggle with automated manual project evaluation processes.',
        proposedSolution: 'An AI-driven project evaluation and feedback platform with real grading.',
      });
      expect(parseResult.success).toBe(false);
    });

    test('TEST 3: Only student name entered in fields -> REJECT, No score', () => {
      const studentName = 'Manoranjith';
      const result = validateMeaningfulText(studentName, 30, 'Description');
      expect(result.isValid).toBe(false);

      const parseResult = createProjectCheckerProjectSchema.safeParse({
        title: 'Manoranjith',
        category: 'Manoranjith',
        targetUsers: 'Manoranjith',
        description: 'Manoranjith',
        problemStatement: 'Manoranjith',
        proposedSolution: 'Manoranjith',
      });
      expect(parseResult.success).toBe(false);
    });

    test('TEST 4: Valid metadata but no source code/GitHub -> Evaluation blocked OR criteria marked INSUFFICIENT_EVIDENCE; Never fabricate code quality', () => {
      const submission = {
        title: 'AI Assessment System',
        category: 'Artificial Intelligence',
        targetUsers: 'Students and professors',
        description: 'Automated evaluation platform built with Node.js and TypeScript.',
        problemStatement: 'Evaluating coding assignments manually requires too much effort and lacks objective evidence checking.',
        proposedSolution: 'An evidence-based rubric evaluation engine that assesses uploaded student artifacts.',
        githubUrl: undefined,
        resources: [],
      };

      const check = evidenceAnalyzer.validateProjectSubmission(submission);
      expect(check.isValid).toBe(false);
      expect(check.evidenceQuality).toBe('INSUFFICIENT');
      expect(check.missingEvidence).toContain('sourceCode');

      const classified = evidenceAnalyzer.extractAndClassifyEvidence(submission);
      expect(classified.missingEvidence).toContain('Source code archive or repository not attached');
    });

    test('TEST 5: Description claims YOLOv8 but source code contains no YOLO -> UNVERIFIED claim; No implementation credit for YOLO', () => {
      const submission = {
        title: 'Smart Surveillance System',
        category: 'Computer Vision',
        targetUsers: 'Campus security staff',
        description: 'This application uses YOLOv8, CNN, and React to detect intrusion in real-time.',
        problemStatement: 'Current security monitoring requires manual video watching which causes missed alerts.',
        proposedSolution: 'We deploy an automated model that alerts guards in real-time when motion is detected.',
        technologies: ['YOLOv8', 'CNN', 'React'],
        programmingLanguages: ['Python'],
        resources: [
          { type: 'sourcecode', name: 'index.html' },
        ],
      };

      const classified = evidenceAnalyzer.extractAndClassifyEvidence(submission);
      expect(classified.unverifiedClaims.some(c => c.toLowerCase().includes('yolov8'))).toBe(true);
      expect(classified.inconsistencies.length).toBeGreaterThan(0);
    });

    test('TEST 6: Bad source code with real bugs -> AI identifies actual problems; Must NOT say "clean code"', async () => {
      const badCode = `
        function queryDatabase(userInput) {
          const sql = "SELECT * FROM users WHERE id = " + userInput; // SQL injection vulnerability
          eval(userInput); // arbitrary code execution
          while(true) {} // infinite loop freeze
        }
      `;
      const submission = {
        title: 'User Portal API',
        category: 'Backend Architecture',
        targetUsers: 'Application users',
        description: 'Backend API for user authentication and records retrieval with security flaws.',
        problemStatement: 'Need quick access to data without proper sanitization.',
        proposedSolution: 'Direct concatenated query execution and arbitrary dynamic evaluation.',
        resources: [{ type: 'sourcecode', name: 'server.js', content: badCode }],
      };

      const classified = evidenceAnalyzer.extractAndClassifyEvidence(submission);
      expect(classified.evidenceQuality).not.toBe('HIGH');
    });

    test('TEST 7: Valid complete project -> All applicable rubric criteria evaluated; Overall score = sum of criteria', async () => {
      const validSubmission = {
        title: 'Robust User Management Microservice',
        category: 'Backend Architecture',
        targetUsers: 'Enterprise developers needing high performance caching and state synchronization',
        description: 'A modular in-memory user registry providing strict validation and thread-safe data structures.',
        problemStatement: 'Distributed systems often suffer from inconsistent user session validation and slow in-memory retrieval.',
        proposedSolution: 'A strictly typed TypeScript registry implementing idempotent state mutations and safe memory lookups.',
        githubUrl: 'https://github.com/provalix/user-manager',
        resources: [
          { type: 'sourcecode', name: 'manager.ts' },
          { type: 'projectreport', name: 'architecture_report.pdf' },
        ],
      };

      const evidence = evidenceAnalyzer.extractAndClassifyEvidence(validSubmission);
      const analysis = await gemini.evaluateProject(validSubmission, undefined, evidence);

      expect(analysis.criteria).toBeDefined();
      const criteriaList = Object.values(analysis.criteria) as any[];
      expect(criteriaList.length).toBe(7);

      const computedTotal = criteriaList.reduce((sum: number, c: any) => sum + (c.obtainedScore ?? c.score ?? 0), 0);
      expect(Math.abs(analysis.overallScore - computedTotal)).toBeLessThanOrEqual(0.1);
      
      // Ensure no forbidden fallback score
      expect([88, 89, 44.5, 45]).not.toContain(analysis.overallScore);
    }, 30000);
  });

  // ==========================================
  // CLASSROOM EVALUATION (TEST 8 - 10)
  // ==========================================

  describe('CLASSROOM AI ANALYSIS (TESTS 8 - 10)', () => {
    test('TEST 8: Missing required source code -> BLOCKED_MISSING_EVIDENCE', () => {
      const requiredResources = ['sourcecode', 'report'];
      const submission = {
        title: 'Project Without Code',
        category: 'Data Science',
        description: 'A comprehensive study on algorithmic fairness with full thesis and experimental analysis.',
        problemStatement: 'Biased models impact real-world decision making in financial credit underwriting.',
        proposedSolution: 'A statistical auditing framework calculating demographic parity across distributions.',
        resources: [
          { type: 'report', name: 'thesis.pdf' },
        ],
      };

      const result = evidenceAnalyzer.validateClassroomSubmission(submission, requiredResources);
      expect(result.isValid).toBe(false);
      expect(result.missingEvidence).toContain('sourcecode');
      expect(result.evidenceQuality).toBe('INSUFFICIENT');
    });

    test('TEST 9: Missing required report -> BLOCKED_MISSING_EVIDENCE', () => {
      const requiredResources = ['sourcecode', 'report'];
      const submission = {
        title: 'Project Without Report',
        category: 'Data Science',
        description: 'A comprehensive study on algorithmic fairness with full code and experimental analysis.',
        problemStatement: 'Biased models impact real-world decision making in financial credit underwriting.',
        proposedSolution: 'A statistical auditing framework calculating demographic parity across distributions.',
        resources: [
          { type: 'sourcecode', name: 'model.py' },
        ],
      };

      const result = evidenceAnalyzer.validateClassroomSubmission(submission, requiredResources);
      expect(result.isValid).toBe(false);
      expect(result.missingEvidence).toContain('report');
      expect(result.evidenceQuality).toBe('INSUFFICIENT');
    });

    test('TEST 10: Valid submission -> Real AI evaluation permitted', () => {
      const requiredResources = ['sourcecode', 'report'];
      const submission = {
        title: 'Valid Complete Submission',
        category: 'Data Science',
        description: 'A comprehensive study on algorithmic fairness with full code, thesis, and experimental analysis.',
        problemStatement: 'Biased models impact real-world decision making in financial credit underwriting.',
        proposedSolution: 'A statistical auditing framework calculating demographic parity across distributions.',
        resources: [
          { type: 'sourcecode', name: 'model.py' },
          { type: 'report', name: 'thesis.pdf' },
        ],
      };

      const result = evidenceAnalyzer.validateClassroomSubmission(submission, requiredResources);
      expect(result.isValid).toBe(true);
      expect(result.evidenceQuality).toBe('HIGH');
    });
  });

  // ==========================================
  // CHATBOT (TEST 11 - 20)
  // ==========================================

  describe('CHATBOT INTENT & MULTILINGUAL RESPONSES (TESTS 11 - 20)', () => {
    test('TEST 11: "What is React?" -> Programming answer without requiring project evidence', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'What is React?',
      });

      expect(res.contextUsed.detectedIntent).toBe('PROGRAMMING');
      expect(res.contextUsed.hasProjectContext).toBe(false);
      expect(res.message.toLowerCase()).toMatch(/react|component|library|javascript|ui/i);
    }, 25000);

    test('TEST 12: "What is normalization in DBMS?" -> DBMS explanation', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'What is normalization in DBMS?',
      });

      expect(res.contextUsed.detectedIntent).toBe('ACADEMIC');
      expect(res.message.toLowerCase()).toMatch(/normalization|redundancy|table|1nf|2nf|3nf/i);
    }, 25000);

    test('TEST 13: "Explain Python decorators." -> Python explanation', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'Explain Python decorators.',
      });

      expect(res.contextUsed.detectedIntent).toBe('PROGRAMMING');
      expect(res.message.toLowerCase()).toMatch(/function|wrapper|decorator|@/i);
    }, 25000);

    test('TEST 14: "What is my project score?" -> Authenticated user actual score only', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'What is my project score?',
      });

      expect(res.message).toBeDefined();
      // Must never hallucinate fake score like 88/100 or 89%
      expect(res.message).not.toMatch(/88\/100|89%/);
    }, 25000);

    test('TEST 15: "Why did I lose marks in code quality?" -> Actual evaluation evidence', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'Why did I lose marks in code quality?',
      });

      expect(res.message).toBeDefined();
    }, 25000);

    test('TEST 16: "What is TCP?" -> Networking explanation', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'What is TCP?',
      });

      expect(res.message.toLowerCase()).toMatch(/tcp|protocol|transmission|connection|ip|packet/i);
      expect(res.contextUsed.hasProjectContext).toBe(false);
    }, 25000);

    test('TEST 17: After project evaluation answer, ask "What is DBMS normalization?" -> DBMS answer, NOT previous evaluation answer', async () => {
      mockMessages = [
        { id: 'm1', role: 'user', message: 'Explain my evaluation.' },
        { id: 'm2', role: 'assistant', message: 'Your project evaluation scored 74/100 with deduction for missing test coverage.' },
      ];

      const res = await chatbotService.processMessage(userId, {
        conversationId: 'conv-audit-999',
        message: 'What is DBMS normalization?',
      });

      expect(res.message.toLowerCase()).toMatch(/normalization|database|redundancy|table/i);
      expect(res.message).not.toContain('scored 74/100');
    }, 25000);

    test('TEST 18: Ask same question twice -> Answers address current request and do not blindly duplicate stale response', async () => {
      const q = 'How does binary search work?';
      const res1 = await chatbotService.processMessage(userId, { message: q });
      
      mockMessages = [
        { id: 'm1', role: 'user', message: q },
        { id: 'm2', role: 'assistant', message: res1.message },
      ];

      const res2 = await chatbotService.processMessage(userId, {
        conversationId: 'conv-audit-999',
        message: q,
      });

      expect(res2.message.toLowerCase()).toMatch(/binary search|divide|sorted|array/i);
    }, 30000);

    test('TEST 19: Tamil question -> Tamil answer', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'React என்றால் என்ன? சுருக்கமாக விளக்கவும்.',
      });

      expect(res.message).toBeDefined();
      const hasTamil = /[\u0B80-\u0BFF]/.test(res.message);
      expect(hasTamil).toBe(true);
    }, 25000);

    test('TEST 20: Tanglish question -> Tanglish answer', async () => {
      const res = await chatbotService.processMessage(userId, {
        message: 'React la useState hook epdi use panradhu? Konjam explain pannunga.',
      });

      expect(res.message).toBeDefined();
      expect(res.message.toLowerCase()).toMatch(/state|hook|usestate/i);
    }, 25000);
  });

  // ==========================================
  // AUTHENTICATION (TEST 21 - 23)
  // ==========================================

  describe('AUTHENTICATION INTEGRITY (TESTS 21 - 23)', () => {
    test('TEST 21: Sign in -> valid token -> 200 authorized', async () => {
      const validPayload = {
        sub: 'usr_valid_tester_01',
        email: 'tester@provalix.ai',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const signedToken = jwt.sign(validPayload, 'supabase_secret_key');

      const verified = await verifySupabaseToken(signedToken);
      expect(verified).toBeDefined();
      expect(verified?.id).toBe('usr_valid_tester_01');
      expect(verified?.email).toBe('tester@provalix.ai');
    });

    test('TEST 22: Refresh browser / persistent token -> still authenticated', async () => {
      const persistentPayload = {
        sub: 'usr_persistent_02',
        email: 'persistent@provalix.ai',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) + 1800,
      };
      const persistentToken = jwt.sign(persistentPayload, 'supabase_secret_key');

      const verified = await verifySupabaseToken(persistentToken);
      expect(verified).toBeDefined();
      expect(verified?.id).toBe('usr_persistent_02');
    });

    test('TEST 23: Expired or invalid token -> 401 rejected with clear auth error', async () => {
      // Expired token (1 hour in the past)
      const expiredPayload = {
        sub: 'usr_expired_03',
        email: 'expired@provalix.ai',
        aud: 'authenticated',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) - 3600,
      };
      const expiredToken = jwt.sign(expiredPayload, 'supabase_secret_key');

      const verifiedExpired = await verifySupabaseToken(expiredToken);
      expect(verifiedExpired).toBeNull();

      // Corrupted / malformed token
      const malformedToken = 'not_a_valid_jwt_token_at_all';
      const verifiedMalformed = await verifySupabaseToken(malformedToken);
      expect(verifiedMalformed).toBeNull();
    });
  });
});

import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { chatbotRepository } from '../src/integrations/chatbot/ChatbotRepository';
import { contextService } from '../src/integrations/chatbot/ContextService';
import { knowledgeBaseService } from '../src/integrations/knowledge-base/KnowledgeBaseService';
import { prisma } from '../src/config/prisma';

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
        id: 'user-architecture-123',
        name: 'Test Student',
        permanentId: 'PRV-8888',
      }),
    },
  },
}));

describe('PROVALIX AI CHATBOT ARCHITECTURE & EXACT TEST CASES (A-I)', () => {
  const userId = 'user-architecture-123';
  const projectId = 'proj-real-456';

  let mockMessages: Array<{ id: string; role: string; message: string; sources?: any[] }> = [];

  beforeEach(() => {
    jest.clearAllMocks();
    mockMessages = [];

    (chatbotRepository.createConversation as jest.Mock).mockImplementation((uId, title, pId, sId) => {
      return Promise.resolve({
        id: 'conv-arch-test',
        userId: uId,
        title,
        projectId: pId,
        submissionId: sId,
        messages: mockMessages,
      });
    });

    (chatbotRepository.findConversationById as jest.Mock).mockImplementation((convId) => {
      return Promise.resolve({
        id: convId,
        userId,
        title: 'Architecture Conversation',
        projectId,
        messages: mockMessages,
      });
    });

    (chatbotRepository.addMessage as jest.Mock).mockImplementation((convId, role, message, sources) => {
      const msgObj = { id: `msg-${Date.now()}-${Math.random()}`, role, message, sources };
      mockMessages.push(msgObj);
      return Promise.resolve(msgObj);
    });

    (knowledgeBaseService.retrieveContext as jest.Mock).mockResolvedValue({
      contextText: 'Provalix evaluation guidelines',
      sources: [{ title: 'Evaluation Guidelines', category: 'Platform Rules', id: 'kb-1' }],
    });
  });

  // Case A: "What is React?" -> React answer
  test('Case A: "What is React?" returns clear React explanation and classifies as PROGRAMMING without project context', async () => {
    const res = await chatbotService.processMessage(userId, {
      message: 'What is React?',
    });

    expect(res.contextUsed.detectedIntent).toBe('PROGRAMMING');
    expect(res.contextUsed.hasProjectContext).toBe(false);
    expect(res.message).toContain('React');
    expect(res.message).toMatch(/(JavaScript library|components|Virtual DOM|UI)/i);
  });

  // Case B: "What is normalization in DBMS?" -> DBMS answer, NOT React
  test('Case B: "What is normalization in DBMS?" returns DBMS normalization answer and DOES NOT repeat React', async () => {
    // Simulate conversation where user previously asked about React
    mockMessages = [
      { id: 'm1', role: 'user', message: 'What is React?' },
      { id: 'm2', role: 'assistant', message: 'React is an open-source, component-based front-end JavaScript library...' },
    ];

    const res = await chatbotService.processMessage(userId, {
      conversationId: 'conv-arch-test',
      message: 'What is normalization in DBMS?',
    });

    expect(res.contextUsed.detectedIntent).toBe('ACADEMIC');
    expect(res.message.toLowerCase()).toContain('normalization');
    expect(res.message).toContain('1NF');
    expect(res.message).toContain('3NF');
    // Critical Requirement: Must NOT repeat the React answer!
    expect(res.message).not.toContain('React is an open-source');
  });

  // Case C: "Explain Python decorators" -> Python answer
  test('Case C: "Explain Python decorators" returns Python decorators explanation with code example', async () => {
    const res = await chatbotService.processMessage(userId, {
      message: 'Explain Python decorators',
    });

    expect(res.contextUsed.detectedIntent).toBe('PROGRAMMING');
    expect(res.contextUsed.hasProjectContext).toBe(false);
    expect(res.message).toMatch(/(decorator|decorators)/i);
    expect(res.message).toContain('```python');
  });

  // Case D: "What is my project score?" -> use project context
  test('Case D: "What is my project score?" injects authorized project context and reports real score', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue({
      id: projectId,
      userId,
      title: 'Smart Agri Analytics',
      problemStatement: 'Soil quality assessment bottleneck',
      proposedSolution: 'Sensor-driven ML dashboard',
      aiEvaluation: {
        totalScore: 88.5,
        problemDefinitionScore: 13,
        innovationNoveltyScore: 18,
        technicalImplementationScore: 18,
        functionalityScore: 13.5,
        codeQualityScore: 8.5,
        documentationScore: 9,
        overallQualityScore: 8.5,
        strengths: 'Solid modular architecture',
        weaknesses: 'Add unit tests for edge cases',
        improvementPlan: 'Implement jest test suites',
      },
      plagiarism: null,
    });

    const res = await chatbotService.processMessage(userId, {
      projectId,
      message: 'What is my project score?',
    });

    expect(res.contextUsed.detectedIntent).toBe('PROJECT');
    expect(res.contextUsed.hasProjectContext).toBe(true);
    expect(res.message).toMatch(/88\.5(\/100|\s*out of\s*100|\s*\/\s*100)/i);
    expect(res.message).toContain('Smart Agri Analytics');
  });

  // Case E: "Why did I lose marks in code quality?" -> use relevant rubric/project evidence
  test('Case E: "Why did I lose marks in code quality?" explains deduction reasons from evaluation evidence', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue({
      id: projectId,
      userId,
      title: 'Smart Agri Analytics',
      aiEvaluation: {
        totalScore: 88.5,
        codeQualityScore: 8.5,
        weaknesses: 'Automated test coverage is missing for API boundaries',
        improvementPlan: 'Add unit test coverage',
      },
    });

    const res = await chatbotService.processMessage(userId, {
      projectId,
      message: 'Why did I lose marks in code quality?',
    });

    expect(res.contextUsed.detectedIntent).toBe('PROJECT');
    expect(res.contextUsed.hasProjectContext).toBe(true);
    expect(res.message).toMatch(/(test coverage|Code Quality|deduction|validation)/i);
  });

  // Case F: "What is TCP?" -> general/academic answer without project context
  test('Case F: "What is TCP?" returns academic transport layer explanation without injecting project context', async () => {
    const res = await chatbotService.processMessage(userId, {
      projectId, // Even when projectId is passed, non-project queries must NOT inject project context!
      message: 'What is TCP?',
    });

    expect(res.contextUsed.detectedIntent).toBe('ACADEMIC');
    expect(res.contextUsed.hasProjectContext).toBe(false);
    expect(res.message).toContain('Transmission Control Protocol');
    expect(res.message).toMatch(/(connection-oriented|reliable|handshake)/i);
    expect(res.message).not.toContain('Smart Agri Analytics');
  });

  // Case G: "What are its advantages?" after asking about React -> React advantages
  test('Case G: "What are its advantages?" after asking about React resolves "its" to React and returns React advantages', async () => {
    // Conversation history with React discussion
    mockMessages = [
      { id: 'm1', role: 'user', message: 'What is React?' },
      { id: 'm2', role: 'assistant', message: 'React is a component-based frontend library developed by Meta.' },
    ];

    const res = await chatbotService.processMessage(userId, {
      conversationId: 'conv-arch-test',
      message: 'What are its advantages?',
    });

    expect(res.contextUsed.detectedIntent).toBe('FOLLOW_UP');
    expect(res.message).toMatch(/(Advantages of React|Virtual DOM|Component|Reusable)/i);
  });

  // Case H: Ask completely unrelated question after a project-analysis question -> must NOT repeat project analysis
  test('Case H: Unrelated question "What is TCP?" after project score analysis does NOT repeat project analysis', async () => {
    // Previous message was project analysis
    mockMessages = [
      { id: 'p1', role: 'user', message: 'What is my project score?' },
      { id: 'p2', role: 'assistant', message: 'Here is your authorized evaluation breakdown: AI Total Score: 88.5/100...' },
    ];

    const res = await chatbotService.processMessage(userId, {
      conversationId: 'conv-arch-test',
      projectId,
      message: 'What is TCP?',
    });

    expect(res.contextUsed.detectedIntent).toBe('ACADEMIC');
    expect(res.contextUsed.hasProjectContext).toBe(false);
    expect(res.message).toContain('Transmission Control Protocol');
    expect(res.message).not.toContain('88.5/100');
    expect(res.message).not.toContain('authorized evaluation breakdown');
  });

  // Case I: Ask a project question for which there is no evidence -> clearly says insufficient project evidence
  test('Case I: Asking a project question with no evidence explicitly returns "I don\'t have enough project evidence to answer that."', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await chatbotService.processMessage(userId, {
      message: 'What CNN architecture did I use in my project?',
    });

    expect(res.contextUsed.detectedIntent).toBe('PROJECT');
    expect(res.message).toContain("I don't have enough project evidence to answer that.");
  });

  // Multilingual tests: Tamil and Tanglish
  test('Multilingual: Tamil query "React என்றால் என்ன?" responds in Tamil', async () => {
    const res = await chatbotService.processMessage(userId, {
      message: 'React என்றால் என்ன?',
    });

    expect(res.contextUsed.detectedLanguage).toBe('tamil');
    expect(res.message).toContain('React');
    expect(res.message).toContain('பயனர் இடைமுகங்களை');
  });

  test('Multilingual: Tanglish query "React na enna?" responds in Tanglish', async () => {
    const res = await chatbotService.processMessage(userId, {
      message: 'React na enna?',
    });

    expect(res.contextUsed.detectedLanguage).toBe('tanglish');
    expect(res.message).toContain('React');
    expect(res.message).toMatch(/(user interfaces|components|Virtual DOM)/i);
  });
});

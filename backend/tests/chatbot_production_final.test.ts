import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { chatbotRepository } from '../src/integrations/chatbot/ChatbotRepository';
import { contextService } from '../src/integrations/chatbot/ContextService';
import { knowledgeBaseService } from '../src/integrations/knowledge-base/KnowledgeBaseService';
import { GeminiProvider } from '../src/integrations/ai/GeminiProvider';
import { MockAIProvider } from '../src/integrations/ai/MockAIProvider';
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
      count: jest.fn(),
    },
    classroomMember: {
      findMany: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-auth-123',
        name: 'Alex Morgan',
        permanentId: 'PRV-10482',
        department: 'Computer Science',
        year: '4th Year',
      }),
    },
  },
}));

describe('PROVALIX AI ASSISTANT — 20 FINAL PRODUCTION CRITERIA TESTS', () => {
  const authorizedUserId = 'user-auth-123';
  const unauthorizedUserId = 'user-unauth-999';
  const authorizedProjectId = 'project-ai-101';

  beforeEach(() => {
    jest.clearAllMocks();

    (chatbotRepository.createConversation as jest.Mock).mockImplementation(
      (userId, title, projectId, submissionId) =>
        Promise.resolve({
          id: 'conv-final-test',
          userId,
          title,
          projectId,
          submissionId,
          messages: [],
        })
    );

    (chatbotRepository.findConversationById as jest.Mock).mockResolvedValue({
      id: 'conv-final-test',
      userId: authorizedUserId,
      title: 'Final Test Session',
      messages: [],
    });

    (chatbotRepository.addMessage as jest.Mock).mockResolvedValue({
      id: 'msg-final-1',
      role: 'assistant',
      message: 'Assistant response',
    });

    (knowledgeBaseService.retrieveContext as jest.Mock).mockResolvedValue({
      contextText: 'Provalix evaluation combines AI rubric grading and faculty viva assessment.',
      sources: [
        {
          title: 'Classroom Evaluation Guidelines',
          category: 'Platform Rules',
          id: 'kb-guide-1',
        },
      ],
    });

    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.submission.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.classroomMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([]);
  });

  // 1. English general question
  test('1. English general question returns educational content in English', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Explain cloud computing architecture and service models in English',
    });
    expect(res.contextUsed.detectedLanguage).toBe('english');
    expect(res.message).toBeDefined();
    expect(res.message.length).toBeGreaterThan(20);
  });

  // 2. Tamil question
  test('2. Tamil question returns response in Tamil with technical terms preserved', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'தரவுத்தளம் என்றால் என்ன? தமிழ்ல DBMS explain பண்ணு',
    });
    expect(res.contextUsed.detectedLanguage).toBe('tamil');
    expect(res.message).toContain('தரவுத்தள');
    expect(res.message).toContain('DBMS');
  });

  // 3. Tanglish question
  test('3. Tanglish question responds naturally in Tanglish', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'normalization na enna? Tanglish la explain pannu',
    });
    expect(res.contextUsed.detectedLanguage).toBe('tanglish');
    expect(res.message).toContain('na');
    expect(res.message).toContain('duplicate data');
  });

  // 4. Technical question
  test('4. Technical question is classified as TECHNICAL and provides architectural explanation', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Explain REST API architecture and principles',
    });
    expect(res.contextUsed.categories).toContain('TECHNICAL');
    expect(res.message).toContain('REST');
  });

  // 5. DBMS question
  test('5. DBMS question is classified as DATABASE and provides relational concepts', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Teach me SQL joins and indexing in DBMS',
    });
    expect(res.contextUsed.categories).toContain('DATABASE');
    expect(res.message).toContain('JOIN');
    expect(res.message).toContain('SQL');
  });

  // 6. Project-specific question
  test('6. Project-specific question accesses authorized project data and breaks down score', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue({
      id: authorizedProjectId,
      userId: authorizedUserId,
      title: 'Autonomous Drone Navigation System',
      category: 'Robotics',
      aiEvaluation: {
        totalScore: 88,
        problemDefinitionScore: 13,
        innovationNoveltyScore: 17,
        technicalImplementationScore: 18,
        functionalityScore: 13,
        codeQualityScore: 9,
        documentationScore: 9,
        overallQualityScore: 9,
        strengths: '["Solid obstacle avoidance algorithm"]',
        weaknesses: '["Missing latency benchmarks under high wind"]',
        improvementPlan: '["Add end-to-end simulation stress tests"]',
      },
      plagiarism: {
        overallSimilarity: 3.5,
        status: 'PASSED',
        deduction: 0,
        reason: 'Clean original codebase',
      },
    });

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Explain my score in Autonomous Drone Navigation System',
      projectId: authorizedProjectId,
    });

    expect(res.contextUsed.hasProjectContext).toBe(true);
    expect(res.contextUsed.projectTitle).toBe('Autonomous Drone Navigation System');
    expect(res.message).toContain('Autonomous Drone Navigation System');
    expect(res.message).toContain('88');
  });

  // 7. Current evaluation status
  test('7. Current evaluation status retrieves authentic database evaluation without inventing data', async () => {
    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue({
      id: 'proj-eval-1',
      title: 'Smart Health Monitor',
      aiEvaluation: {
        totalScore: 84,
        problemDefinitionScore: 13,
        innovationNoveltyScore: 16,
        technicalImplementationScore: 17,
        functionalityScore: 13,
        codeQualityScore: 8,
        documentationScore: 8,
        overallQualityScore: 9,
        strengths: '["Good biometric sensor integration"]',
        weaknesses: '["Needs Bluetooth reconnection retry"]',
        improvementPlan: '[]',
      },
    });
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Explain my current evaluation status',
    });

    expect(res.message).toContain('Smart Health Monitor');
    expect(res.message).toContain('84');
    expect(res.sources.some((s) => s.category.includes('Evaluation'))).toBe(true);
  });

  // 8. Upcoming deadlines
  test('8. Upcoming deadlines returns real enrolled classroom deadlines sorted by nearest', async () => {
    const futureDate = new Date(Date.now() + 86400000 * 3); // 3 days in future
    (prisma.classroomMember.findMany as jest.Mock).mockResolvedValue([
      {
        classroom: {
          id: 'cls-1',
          name: 'Distributed Systems Capstone',
          code: 'CS-401',
          deadline: futureDate.toISOString(),
          submissionMode: 'INDIVIDUAL',
          submissions: [],
        },
      },
    ]);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'What deadlines are coming?',
    });

    expect(res.message).toContain('Distributed Systems Capstone');
    expect(res.message).toContain('CS-401');
    expect(res.contextUsed.categories).toContain('DEADLINE');
  });

  // 9. Project score
  test('9. Project score query retrieves real project marks accurately', async () => {
    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue({
      id: 'proj-score-1',
      title: 'Cybersecurity Threat Analyzer',
      aiEvaluation: {
        totalScore: 91,
        problemDefinitionScore: 14,
        innovationNoveltyScore: 18,
        technicalImplementationScore: 19,
        functionalityScore: 14,
        codeQualityScore: 9,
        documentationScore: 8,
        overallQualityScore: 9,
        strengths: '["Advanced packet inspection"]',
        weaknesses: '[]',
        improvementPlan: '[]',
      },
    });
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'What is my project score?',
    });

    expect(res.message).toContain('Cybersecurity Threat Analyzer');
    expect(res.message).toContain('91');
  });

  // 10. Viva practice
  test('10. Viva practice session returns exactly 5 structured defense questions', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Start viva practice for my final year defense',
    });

    expect(res.contextUsed.categories).toContain('VIVA');
    expect(res.message).toContain('Problem Understanding');
    expect(res.message).toContain('Technical Implementation');
    expect(res.message).toContain('Technology / Algorithm Choice');
    expect(res.message).toContain('Feature / Internal Working');
    expect(res.message).toContain('Scenario / Challenge / Failure Handling');
  });

  // 11. Team information
  test('11. Team information query retrieves authenticated user team, captain, and members', async () => {
    (prisma.teamMember.findMany as jest.Mock).mockResolvedValue([
      {
        role: 'LEADER',
        team: {
          id: 'team-alpha',
          name: 'Alpha Coders',
          code: 'TEAM-ALPH-01',
          captain: { id: authorizedUserId, name: 'Alex Morgan', permanentId: 'PRV-10482' },
          members: [
            {
              role: 'LEADER',
              userId: authorizedUserId,
              user: { id: authorizedUserId, name: 'Alex Morgan' },
            },
            {
              role: 'MEMBER',
              userId: 'member-2',
              user: { id: 'member-2', name: 'Samantha Lee' },
            },
          ],
          submissions: [],
        },
      },
    ]);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'What is my team and who is my captain?',
    });

    expect(res.message).toContain('Alpha Coders');
    expect(res.message).toContain('Alex Morgan');
    expect(res.message).toContain('Samantha Lee');
    expect(res.contextUsed.categories).toContain('TEAM');
  });

  // 12. Unauthorized information request
  test('12. Unauthorized request to another user project strictly throws 403 Privacy Restriction', async () => {
    (prisma.projectCheckerProject.findUnique as jest.Mock).mockResolvedValue({
      id: 'private-proj-999',
      userId: 'other-student-uuid', // Belongs to someone else
      title: 'Secret Proprietary AI Model',
    });

    await expect(
      contextService.getAuthorizedProjectContext(unauthorizedUserId, 'private-proj-999')
    ).rejects.toThrow('Privacy Restriction: You are not authorized to access this project evaluation.');
  });

  // 13. No evaluation available
  test('13. When no evaluation is available, clearly states data is unavailable without fabricating scores', async () => {
    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'Explain my current evaluation status',
    });

    expect(res.message).toContain('No evaluation records are currently available');
  });

  // 14. No deadline available
  test('14. When no deadlines are available, clearly states no deadlines exist without fabricating dates', async () => {
    (prisma.classroomMember.findMany as jest.Mock).mockResolvedValue([]);

    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'What deadlines are coming?',
    });

    expect(res.message).toContain('no upcoming deadlines available');
  });

  // 15. Gemini failure → Mock fallback
  test('15. Seamless fallback to MockAIProvider when Gemini provider throws an error', async () => {
    const mockGeminiClient = {
      models: {
        generateContent: jest.fn().mockRejectedValue(new Error('Gemini API 503 Overloaded')),
      },
    };

    const gemini = new GeminiProvider('fake-key-for-test', 'gemini-2.5-flash');
    (gemini as any).client = mockGeminiClient;

    // Call generateResponse directly on gemini instance with error
    const fallbackResponse = await gemini.generateResponse('Explain DBMS in English');
    expect(fallbackResponse).toBeDefined();
    expect(fallbackResponse).toContain('DBMS (Database Management System)');
  });

  // 16. Conversation follow-up
  test('16. Follow-up query understands context from previous conversation messages', async () => {
    (chatbotRepository.findConversationById as jest.Mock).mockResolvedValue({
      id: 'conv-followup-test',
      userId: authorizedUserId,
      title: 'Database Chat',
      messages: [
        { role: 'user', message: 'Explain DBMS' },
        { role: 'assistant', message: 'A DBMS manages data storage, indexing, and transactions.' },
      ],
    });

    const res = await chatbotService.processMessage(authorizedUserId, {
      conversationId: 'conv-followup-test',
      message: 'Give example in SQL',
    });

    expect(res.message).toContain('```sql');
    expect(res.message).toContain('CREATE TABLE');
  });

  // 17. Quick action buttons
  test('17. Quick action query dispatch triggers full pipeline and returns authentic data', async () => {
    (prisma.projectCheckerProject.findFirst as jest.Mock).mockResolvedValue({
      id: 'proj-qa-1',
      title: 'Blockchain Asset Registry',
      aiEvaluation: {
        totalScore: 78,
        problemDefinitionScore: 12,
        innovationNoveltyScore: 15,
        technicalImplementationScore: 16,
        functionalityScore: 12,
        codeQualityScore: 8,
        documentationScore: 8,
        overallQualityScore: 7,
        strengths: '["Good smart contract structure"]',
        weaknesses: '["Gas optimization needed"]',
        improvementPlan: '[]',
      },
    });
    (prisma.submission.findFirst as jest.Mock).mockResolvedValue(null);

    // This query string is identical to the Quick Action pill button
    const quickActionQuery = 'Explain my current evaluation status';
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: quickActionQuery,
    });

    expect(res.message).toContain('Blockchain Asset Registry');
    expect(res.message).toContain('78');
    expect(res.contextUsed.categories).toContain('EVALUATION');
  });

  // 18. RAG response
  test('18. RAG response retrieves knowledge base chunks for Provalix evaluation rules', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'How is the final classroom evaluation score calculated?',
    });

    expect(res.message).toContain('50');
    expect(res.message).toContain('25');
    expect(res.contextUsed.categories).toContain('PROVALIX_PLATFORM');
  });

  // 19. Citation/source response where applicable
  test('19. Platform queries return rich source citations and rubrics cited', async () => {
    const res = await chatbotService.processMessage(authorizedUserId, {
      message: 'What are the viva defense evaluation guidelines?',
    });

    expect(res.sources.length).toBeGreaterThan(0);
    expect(res.sources[0].title).toBe('Classroom Evaluation Guidelines');
    expect(res.sources[0].category).toBe('Platform Rules');
  });

  // 20. Empty message validation
  test('20. Empty or whitespace-only messages are rejected with a 400 validation error', async () => {
    await expect(
      chatbotService.processMessage(authorizedUserId, {
        message: '     ',
      })
    ).rejects.toThrow('Message content cannot be empty');
  });
});

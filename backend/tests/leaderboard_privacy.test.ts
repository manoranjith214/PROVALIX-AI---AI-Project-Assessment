import { leaderboardService } from '../src/services/leaderboardService';
import { evaluationRepository } from '../src/repositories/evaluationRepository';
import { classroomRepository } from '../src/repositories/classroomRepository';

// Mock dependencies to test privacy filtering in isolation
jest.mock('../src/repositories/classroomRepository');
jest.mock('../src/repositories/evaluationRepository');

describe('Leaderboard Privacy & Authorization Tests', () => {
  const studentAId = 'user-student-a-uuid';
  const studentBId = 'user-student-b-uuid';
  const classroomOwnerId = 'user-prof-uuid';
  const classroomId = 'classroom-123-uuid';

  const mockSubmissions = [
    {
      id: 'sub-student-a',
      title: 'Student A AI Drone Project',
      finalTotalScore: 95.0,
      submitterId: studentAId,
      submitter: { id: studentAId, name: 'Student A', permanentId: 'PRV-10001' },
      teamId: null,
      team: null,
      aiEvaluation: {
        rawScore: 48.0,
        finalScore: 48.0,
        deduction: 0,
        feedback: 'CONFIDENTIAL: Student A has exemplary algorithmic reasoning.',
        improvementPlan: JSON.stringify([{ area: 'Publishing', suggestion: 'Submit to IEEE' }]),
      },
      facultyEvaluation: {
        pptDemoScore: 23.5,
        vivaTotalScore: 23.5,
        totalFacultyScore: 47.0,
        feedback: 'CONFIDENTIAL: Student A defended edge cases flawlessly.',
        status: 'Completed',
      },
    },
    {
      id: 'sub-student-b',
      title: 'Student B IoT Health System',
      finalTotalScore: 88.0,
      submitterId: studentBId,
      submitter: { id: studentBId, name: 'Student B', permanentId: 'PRV-10002' },
      teamId: null,
      team: null,
      aiEvaluation: {
        rawScore: 44.0,
        finalScore: 44.0,
        deduction: 0,
        feedback: 'CONFIDENTIAL: Student B has minor memory leak in thread 2.',
        improvementPlan: JSON.stringify([{ area: 'Memory', suggestion: 'Fix free()' }]),
      },
      facultyEvaluation: {
        pptDemoScore: 22.0,
        vivaTotalScore: 22.0,
        totalFacultyScore: 44.0,
        feedback: 'CONFIDENTIAL: Student B struggled with question 3.',
        status: 'Completed',
      },
    },
  ];

  beforeEach(() => {
    (classroomRepository.findById as jest.Mock).mockResolvedValue({
      id: classroomId,
      name: 'CapStone 2026',
      ownerId: classroomOwnerId,
      evaluators: [],
    });

    (evaluationRepository.getLeaderboardData as jest.Mock).mockResolvedValue(mockSubmissions);
  });

  test('Privacy Rule: Student B can see their own evaluation details but CANNOT see Student A confidential details', async () => {
    const result = await leaderboardService.getClassroomLeaderboard(classroomId, studentBId);

    expect(result.leaderboard).toHaveLength(2);

    // Rank 1 is Student A
    const rank1 = result.leaderboard[0] as any;
    expect(rank1.projectTitle).toBe('Student A AI Drone Project');
    expect(rank1.finalTotalScore).toBe(95.0);
    expect(rank1.isOwnSubmission).toBe(false);
    // Student B CANNOT see Student A detailed evaluation or confidential feedback
    expect(rank1.detailedEvaluation).toBeUndefined();

    // Rank 2 is Student B (the requesting user)
    const rank2 = result.leaderboard[1] as any;
    expect(rank2.projectTitle).toBe('Student B IoT Health System');
    expect(rank2.finalTotalScore).toBe(88.0);
    expect(rank2.isOwnSubmission).toBe(true);
    // Student B CAN see their own detailed evaluation
    expect(rank2.detailedEvaluation).toBeDefined();
    expect(rank2.detailedEvaluation.aiScore).toBe(44.0);
    expect(rank2.detailedEvaluation.aiFeedback).toContain('Student B has minor memory leak');
  });

  test('Classroom Owner can inspect detailed evaluations for all participating students', async () => {
    const result = await leaderboardService.getClassroomLeaderboard(classroomId, classroomOwnerId);

    // Classroom Owner has privileged access to all entries
    const rank1 = result.leaderboard[0] as any;
    const rank2 = result.leaderboard[1] as any;

    expect(rank1.detailedEvaluation).toBeDefined();
    expect(rank2.detailedEvaluation).toBeDefined();
  });
});

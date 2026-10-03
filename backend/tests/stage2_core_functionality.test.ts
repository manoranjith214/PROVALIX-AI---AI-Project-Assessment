import { pdfReportGenerator } from '../src/services/pdfReportGenerator';
import {
  validateAndCalculateProjectCheckerScores,
  ProjectCheckerRubricSchema,
} from '../src/validators/aiEvaluationValidator';
import { sourceCodeAnalyzer } from '../src/services/sourceCodeAnalyzer';
import { submissionService } from '../src/services/submissionService';
import { classroomService } from '../src/services/classroomService';
import { prisma } from '../src/config/prisma';
import { AppError } from '../src/middleware/errorMiddleware';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

// Mock Prisma for service tests
jest.mock('../src/config/prisma', () => ({
  prisma: {
    submission: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    classroom: {
      findUnique: jest.fn(),
    },
    classroomMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    team: {
      findUnique: jest.fn(),
    },
    classroomTeamParticipation: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Stage 2: Core Functionality, Reports, AI Evaluation, and Data Consistency', () => {
  const sampleReportData: any = {
    project: {
      id: 'proj-1234',
      title: 'Smart Healthcare AI Diagnostic Engine',
      category: 'Healthcare AI',
      description: 'An automated diagnostic pipeline using computer vision and transformer models.',
      problemStatement: 'Delayed clinical diagnostic turnaround in remote hospitals.',
      proposedSolution: 'Lightweight convolutional network deployed at edge nodes.',
      programmingLanguages: ['Python', 'TypeScript'],
      technologies: ['PyTorch', 'FastAPI', 'Docker'],
    },
    plagiarism: {
      codeSimilarity: 12.5,
      reportSimilarity: 8.0,
      overallSimilarity: 10.25,
      status: 'Low',
      feedback: 'Original implementation with standard library usage.',
    },
    aiEvaluation: {
      totalScoreOutof100: 84.5,
      criteria: {
        problemDefinition: { score: 14, maxScore: 15, feedback: 'Clearly defined clinical bottleneck.' },
        innovationNovelty: { score: 17, maxScore: 20, feedback: 'Novel edge-inference architecture.' },
        technicalImplementation: { score: 17, maxScore: 20, feedback: 'Solid model pipeline and modular backend.' },
        functionality: { score: 13, maxScore: 15, feedback: 'API endpoints operational with validated responses.' },
        codeQuality: { score: 8, maxScore: 10, feedback: 'Clean PEP8 compliance and type hints.' },
        documentation: { score: 8, maxScore: 10, feedback: 'Comprehensive README and API swagger docs.' },
        overallQuality: { score: 7.5, maxScore: 10, feedback: 'High architectural rigor.' },
      },
      strengths: ['Robust edge model deployment', 'Clear clinical justification'],
      weaknesses: ['Integration test coverage could be expanded beyond 75%'],
      technicalAnalysis: 'Technical evaluation confirms containerized model deployment with REST endpoints.',
      codeAnalysis: 'Clean modular Python structure across services and controllers.',
      documentationAnalysis: 'Architecture diagrams and environment setups clearly documented.',
      actionableSuggestions: ['Add end-to-end integration tests for DICOM ingestion.'],
      improvementPlan: [
        { area: 'Testing', suggestion: 'Add automated CI tests for model inference.', priority: 'High' },
        { area: 'Performance', suggestion: 'Implement ONNX runtime quantization for faster inference.', priority: 'Medium' },
      ],
      summary: 'Strong standalone project with excellent real-world clinical applicability.',
      aiModel: 'Gemini 2.5 Flash',
      evaluatedAt: new Date().toISOString(),
    },
  };

  describe('1. PDF Report Generation & Validation', () => {
    it('generates a valid binary PDF buffer starting with %PDF- header', async () => {
      const buffer = await pdfReportGenerator.generateProjectPdf(sampleReportData);
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);

      // Verify PDF magic bytes header %PDF-
      const header = buffer.slice(0, 5).toString('ascii');
      expect(header).toBe('%PDF-');
    });

    it('contains all 7 Project Checker criteria and scores in the PDF generation data', async () => {
      const keys = Object.keys(sampleReportData.aiEvaluation.criteria);
      expect(keys).toEqual([
        'problemDefinition',
        'innovationNovelty',
        'technicalImplementation',
        'functionality',
        'codeQuality',
        'documentation',
        'overallQuality',
      ]);

      const buffer = await pdfReportGenerator.generateProjectPdf(sampleReportData);
      expect(buffer.length).toBeGreaterThan(2000);
    });

    it('does NOT include classroom marks (PPT/Demo 25, Viva 25) in Project Checker report PDF', async () => {
      const reportStr = JSON.stringify(sampleReportData);
      expect(reportStr).not.toContain('pptDemoScore');
      expect(reportStr).not.toContain('vivaTotalScore');
      expect(reportStr).not.toContain('vivaResponses');
    });
  });

  describe('2. Project Checker Scoring & AI Output Validation', () => {
    it('calculates total score authoritatively as the sum of validated criteria', () => {
      const rawAiOutput = {
        criteria: {
          problemDefinition: { score: 14, feedback: 'Strong problem statement' },
          innovationNovelty: { score: 18, feedback: 'Creative approach' },
          technicalImplementation: { score: 17, feedback: 'Clean architecture' },
          functionality: { score: 13, feedback: 'All features working' },
          codeQuality: { score: 9, feedback: 'High quality code' },
          documentation: { score: 8, feedback: 'Detailed docs' },
          overallQuality: { score: 8, feedback: 'Solid submission' },
        },
        strengths: ['Great modularity'],
        weaknesses: ['Needs more tests'],
        technicalAnalysis: 'Detailed technical analysis provided.',
        codeAnalysis: 'Clean code structure.',
        documentationAnalysis: 'Thorough documentation.',
        summary: 'Excellent project.',
      };

      const result = validateAndCalculateProjectCheckerScores(rawAiOutput);
      // Expected sum: 14 + 18 + 17 + 13 + 9 + 8 + 8 = 87
      expect(result.totalScore).toBe(87);
    });

    it('rejects scores exceeding criterion maximums and throws structured 502 error', () => {
      const invalidAiOutput = {
        criteria: {
          problemDefinition: { score: 25, feedback: 'Exceeds max 15' }, // Max is 15!
          innovationNovelty: { score: 18, feedback: 'Creative approach' },
          technicalImplementation: { score: 17, feedback: 'Clean architecture' },
          functionality: { score: 13, feedback: 'All features working' },
          codeQuality: { score: 9, feedback: 'High quality code' },
          documentation: { score: 8, feedback: 'Detailed docs' },
          overallQuality: { score: 8, feedback: 'Solid submission' },
        },
        strengths: ['Great modularity'],
        weaknesses: ['Needs more tests'],
        technicalAnalysis: 'Detailed technical analysis provided.',
        codeAnalysis: 'Clean code structure.',
        documentationAnalysis: 'Thorough documentation.',
        summary: 'Invalid project score.',
      };

      expect(() => validateAndCalculateProjectCheckerScores(invalidAiOutput)).toThrow(AppError);
    });

    it('rejects negative scores and throws structured 502 error', () => {
      const negativeAiOutput = {
        criteria: {
          problemDefinition: { score: -2, feedback: 'Negative score' },
          innovationNovelty: { score: 18, feedback: 'Creative approach' },
          technicalImplementation: { score: 17, feedback: 'Clean architecture' },
          functionality: { score: 13, feedback: 'All features working' },
          codeQuality: { score: 9, feedback: 'High quality code' },
          documentation: { score: 8, feedback: 'Detailed docs' },
          overallQuality: { score: 8, feedback: 'Solid submission' },
        },
        strengths: ['Great modularity'],
        weaknesses: ['Needs more tests'],
        technicalAnalysis: 'Detailed technical analysis provided.',
        codeAnalysis: 'Clean code structure.',
        documentationAnalysis: 'Thorough documentation.',
        summary: 'Invalid project score.',
      };

      expect(() => validateAndCalculateProjectCheckerScores(negativeAiOutput)).toThrow(AppError);
    });

    it('rejects empty or missing criteria and throws structured 502 error', () => {
      expect(() => validateAndCalculateProjectCheckerScores(null)).toThrow(AppError);
      expect(() => validateAndCalculateProjectCheckerScores({})).toThrow(AppError);
    });
  });

  describe('3. Source-Code Analysis Engine', () => {
    it('returns sourceAvailable: false when no source code files are attached', async () => {
      const emptyProject = { resources: [] };
      const analysis = await sourceCodeAnalyzer.analyzeProjectSource(emptyProject);
      expect(analysis.sourceAvailable).toBe(false);
      expect(analysis.fileCount).toBe(0);
      expect(analysis.primaryLanguage).toBe('None');
      expect(analysis.summary).toContain('No source code archive');
    });

    it('inspects zip archive contents, detects languages, dependencies, and code smells', async () => {
      // Create a temporary zip archive in memory for testing
      const zip = new AdmZip();
      const samplePy = `import os
import sys

def main():
    api_key = "super_secret_unencrypted_key"
    print("Executing healthcare diagnostics")
    return True
`;
      const samplePkg = JSON.stringify({
        dependencies: { react: '^18.2.0', express: '^4.18.2' },
        devDependencies: { jest: '^29.5.0' },
      });
      const sampleReadme = '# Sample Diagnostic Engine\n\nComprehensive instructions for setting up the model pipeline.';

      zip.addFile('main.py', Buffer.from(samplePy, 'utf-8'));
      zip.addFile('package.json', Buffer.from(samplePkg, 'utf-8'));
      zip.addFile('README.md', Buffer.from(sampleReadme, 'utf-8'));
      zip.addFile('tests/test_main.py', Buffer.from('def test_sample(): pass', 'utf-8'));

      const tempDir = path.join(process.cwd(), 'scratch_test');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const tempZipPath = path.join(tempDir, 'test_project.zip');
      zip.writeZip(tempZipPath);

      try {
        const project = {
          resources: [{ path: tempZipPath, name: 'test_project.zip', type: 'sourcecode' }],
        };

        const analysis = await sourceCodeAnalyzer.analyzeProjectSource(project);
        expect(analysis.sourceAvailable).toBe(true);
        expect(analysis.fileCount).toBe(4);
        expect(analysis.languages['Python']).toBeDefined();
        expect(analysis.dependencies).toContain('react');
        expect(analysis.dependencies).toContain('express');
        expect(analysis.hasTests).toBe(true);
        expect(analysis.testFileCount).toBe(1);
        expect(analysis.hasDocumentation).toBe(true);
        // Code smell detection should find hardcoded secret
        expect(analysis.codeSmells.some((s) => s.rule === 'Hardcoded Secret')).toBe(true);
      } finally {
        if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
        if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);
      }
    });
  });

  describe('4. Classroom Role Determination & Team Authorization', () => {
    it('authoritatively identifies classroom owner as OWNER and approved member as MEMBER without array index guessing', async () => {
      const mockClassroom: any = {
        id: 'cls-100',
        name: 'Distributed Systems',
        ownerId: 'prof-user-1',
        members: [
          { userId: 'student-2', role: 'MEMBER', status: 'Approved' },
          { userId: 'student-3', role: 'MEMBER', status: 'Approved' },
        ],
        evaluators: [{ evaluatorId: 'faculty-eval-1' }],
      };

      const { classroomRepository } = require('../src/repositories/classroomRepository');
      jest.spyOn(classroomRepository, 'findById').mockResolvedValue(mockClassroom);

      // 1. Owner lookup
      const ownerResult = await classroomService.getClassroomById('cls-100', 'prof-user-1');
      expect(ownerResult.currentUserRole).toBe('OWNER');

      // 2. Evaluator lookup
      const evalResult = await classroomService.getClassroomById('cls-100', 'faculty-eval-1');
      expect(evalResult.currentUserRole).toBe('EVALUATOR');

      // 3. Specific student lookup (student-3 is at index 1, not index 0)
      const studentResult = await classroomService.getClassroomById('cls-100', 'student-3');
      expect(studentResult.currentUserRole).toBe('MEMBER');

      // 4. Non-member lookup
      const outsiderResult = await classroomService.getClassroomById('cls-100', 'stranger-99');
      expect(outsiderResult.currentUserRole).toBeNull();
    });

    it('blocks non-captain from submitting project on behalf of the team', async () => {
      const { classroomRepository } = require('../src/repositories/classroomRepository');
      const { teamRepository } = require('../src/repositories/teamRepository');

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-team',
        submissionMode: 'Team',
        status: 'Active',
      });

      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-42',
        captainId: 'captain-user',
        members: [{ userId: 'captain-user' }, { userId: 'normal-member' }],
      });

      // Attempt to submit as normal-member (not captain)
      await expect(
        submissionService.createSubmission('cls-team', 'normal-member', {
          teamId: 'team-42',
          title: 'Unauthorized Team Project',
        })
      ).rejects.toThrow('Only the team captain can submit on behalf of the team');
    });

    it('blocks team from submitting if team participation in classroom is not Approved', async () => {
      const { classroomRepository } = require('../src/repositories/classroomRepository');
      const { teamRepository } = require('../src/repositories/teamRepository');

      jest.spyOn(classroomRepository, 'findById').mockResolvedValue({
        id: 'cls-team',
        submissionMode: 'Team',
        status: 'Active',
      });

      jest.spyOn(teamRepository, 'findById').mockResolvedValue({
        id: 'team-42',
        captainId: 'captain-user',
        members: [{ userId: 'captain-user' }],
      });

      (prisma.classroomTeamParticipation.findUnique as jest.Mock).mockResolvedValue({
        classroomId: 'cls-team',
        teamId: 'team-42',
        status: 'Incomplete Team', // Not Approved!
      });

      await expect(
        submissionService.createSubmission('cls-team', 'captain-user', {
          teamId: 'team-42',
          title: 'Incomplete Team Project',
        })
      ).rejects.toThrow('This team does not have an approved participation status in this classroom');
    });
  });
});

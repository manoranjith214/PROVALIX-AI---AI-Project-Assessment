import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import PDFDocument from 'pdfkit';

export interface DemoEvidenceFiles {
  sourceCodePath: string;
  sourceCodeName: string;
  sourceCodeSize: string;
  reportPath: string;
  reportName: string;
  reportSize: string;
  presentationPath: string;
  presentationName: string;
  presentationSize: string;
}

export async function generateDemoEvidence(uploadsDir: string): Promise<DemoEvidenceFiles> {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const zipPath = path.join(uploadsDir, 'smart-campus-attendance-source.zip');
  const reportPath = path.join(uploadsDir, 'smart-campus-attendance-report.pdf');
  const presentationPath = path.join(uploadsDir, 'smart-campus-attendance-presentation.pdf');

  // ==========================================
  // 1. GENERATE SOURCE CODE ZIP ARCHIVE
  // ==========================================
  console.log('[DemoEvidence] Assembling real source code archive...');
  const zip = new AdmZip();

  // Root package.json
  const packageJson = {
    name: 'smart-campus-attendance-system',
    version: '1.0.0',
    description: 'Smart Campus Attendance & Analytics System - Automated student attendance tracking, risk detection, and institutional analytics',
    scripts: {
      dev: 'tsx watch src/server.ts',
      build: 'tsc',
      start: 'node dist/server.js',
      test: 'jest',
    },
    dependencies: {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      typescript: '^5.5.0',
      express: '^4.19.2',
      '@prisma/client': '^5.18.0',
      '@supabase/supabase-js': '^2.45.0',
      '@google/genai': '^2.24.0',
    },
    devDependencies: {
      '@types/react': '^18.3.3',
      '@types/express': '^4.17.21',
      '@types/node': '^20.14.0',
      prisma: '^5.18.0',
      jest: '^29.7.0',
      supertest: '^7.0.0',
      '@types/jest': '^29.5.12',
    },
  };
  zip.addFile('package.json', Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'));

  // Root README.md
  const readmeContent = `# Smart Campus Attendance & Analytics System

## Overview
Smart Campus Attendance & Analytics System is a comprehensive web-based platform designed for higher education institutions to modernize attendance management. It replaces manual roll calls with automated record keeping, real-time analytics dashboards, and threshold-based academic risk alerts.

## Key Features
- **Student Dashboard**: Real-time visualization of course-wise attendance percentages and threshold warning indicators.
- **Faculty Dashboard**: Rapid batch attendance recording, absentee logs, and session management.
- **Academic Risk Detection**: Automated early warnings for students dropping below the 75% attendance threshold.
- **Institutional Analytics**: Aggregate attendance reports across departments, academic years, and semesters.
- **Role-Based Access Control**: Strict segregation between Student, Faculty, and Administrator roles.

## Technology Stack
- **Frontend**: React, TypeScript, TailwindCSS / CSS3, Recharts
- **Backend**: Node.js, Express, TypeScript
- **Database & Storage**: PostgreSQL, Supabase, Prisma ORM
- **AI Analytics**: Google Gemini API for personalized academic intervention insights

## Database Schema Highlights
- \`Student\`: Institutional student profiles, enrollment, and department association
- \`Course\`: Course catalogue, faculty assignment, and credit allocations
- \`AttendanceRecord\`: Session date, present/absent status, and audit timestamps
- \`AttendanceAlert\`: Automated risk notifications triggered when attendance falls below 75%

## Getting Started
\`\`\`bash
# Install dependencies
npm install

# Run database migrations
npx prisma migrate dev

# Run automated test suites
npm test

# Start development server
npm run dev
\`\`\`

## Testing Approach
Automated unit tests with Jest for attendance percentage calculations, boundary conditions (< 75% warning), and integration tests for API endpoints.
`;
  zip.addFile('README.md', Buffer.from(readmeContent, 'utf-8'));

  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: 'ES2022',
      module: 'commonjs',
      moduleResolution: 'node',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
    },
  };
  zip.addFile('tsconfig.json', Buffer.from(JSON.stringify(tsconfig, null, 2), 'utf-8'));

  // Database Schema (Prisma)
  const schemaPrisma = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model Student {
  id             String             @id @default(uuid())
  registerNumber String             @unique
  name           String
  email          String             @unique
  department     String
  year           String
  records        AttendanceRecord[]
  alerts         AttendanceAlert[]
}

model Course {
  id          String             @id @default(uuid())
  code        String             @unique
  name        String
  credits     Int
  records     AttendanceRecord[]
}

model AttendanceRecord {
  id        String   @id @default(uuid())
  studentId String
  student   Student  @relation(fields: [studentId], references: [id])
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id])
  date      DateTime
  status    String   // Present, Absent, Excused
  createdAt DateTime @default(now())
}

model AttendanceAlert {
  id         String   @id @default(uuid())
  studentId  String
  student    Student  @relation(fields: [studentId], references: [id])
  percentage Float
  status     String   // AT_RISK, CRITICAL, RESOLVED
  notifiedAt DateTime @default(now())
}
`;
  zip.addFile('backend/prisma/schema.prisma', Buffer.from(schemaPrisma, 'utf-8'));

  // Backend: server.ts
  const serverTs = `import express from 'express';
import { PrismaClient } from '@prisma/client';
import { attendanceRouter } from './controllers/attendanceController';
import { analyticsRouter } from './services/analyticsService';

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 4000;

app.use(express.json());

app.use('/api/attendance', attendanceRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Smart Campus Attendance API' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(\`Attendance server listening on port \${port}\`);
  });
}

export { app, prisma };
`;
  zip.addFile('backend/src/server.ts', Buffer.from(serverTs, 'utf-8'));

  // Backend: attendanceController.ts
  const attendanceControllerTs = `import { Router, Request, Response } from 'express';
import { prisma } from '../server';

export const attendanceRouter = Router();

export function calculateAttendancePercentage(presentCount: number, totalSessions: number): number {
  if (totalSessions <= 0) return 100.0;
  return Math.round((presentCount / totalSessions) * 1000) / 10;
}

export function isStudentAtRisk(percentage: number): boolean {
  return percentage < 75.0;
}

attendanceRouter.post('/record', async (req: Request, res: Response) => {
  try {
    const { studentId, courseId, status, date } = req.body;
    const record = await prisma.attendanceRecord.create({
      data: {
        studentId,
        courseId,
        status: status || 'Present',
        date: date ? new Date(date) : new Date(),
      },
    });
    res.status(201).json({ success: true, record });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

attendanceRouter.get('/summary/:studentId', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
    });

    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const percentage = calculateAttendancePercentage(present, total);
    const atRisk = isStudentAtRisk(percentage);

    res.json({
      studentId,
      totalSessions: total,
      presentSessions: present,
      percentage,
      atRisk,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;
  zip.addFile('backend/src/controllers/attendanceController.ts', Buffer.from(attendanceControllerTs, 'utf-8'));

  // Backend: analyticsService.ts
  const analyticsServiceTs = `import { Router, Request, Response } from 'express';
import { prisma } from '../server';

export const analyticsRouter = Router();

analyticsRouter.get('/department-overview', async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      include: { records: true },
    });

    let totalSessions = 0;
    let totalPresent = 0;
    let atRiskCount = 0;

    for (const s of students) {
      const sTotal = s.records.length;
      const sPresent = s.records.filter(r => r.status === 'Present').length;
      totalSessions += sTotal;
      totalPresent += sPresent;

      const pct = sTotal > 0 ? (sPresent / sTotal) * 100 : 100;
      if (pct < 75.0) atRiskCount++;
    }

    const overallRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 1000) / 10 : 100;

    res.json({
      department: 'AI & Data Science',
      totalEnrolled: students.length,
      overallAttendanceRate: overallRate,
      studentsAtRisk: atRiskCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
`;
  zip.addFile('backend/src/services/analyticsService.ts', Buffer.from(analyticsServiceTs, 'utf-8'));

  // Backend: aiAdvisorService.ts
  const aiAdvisorServiceTs = `import { GoogleGenAI } from '@google/genai';

export class AttendanceAIAdvisor {
  private aiClient: GoogleGenAI;

  constructor() {
    this.aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  async generateRemediationAdvice(studentName: string, attendancePercentage: number, missedCourses: string[]): Promise<string> {
    const prompt = \`A student named \${studentName} currently has an attendance rate of \${attendancePercentage}%, falling below the institutional requirement of 75%. Missed subjects include: \${missedCourses.join(', ')}. Provide 3 practical, supportive academic remediation recommendations.\`;

    const res = await this.aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    return res.text || 'Maintain regular attendance and consult academic advisor.';
  }
}
`;
  zip.addFile('backend/src/services/aiAdvisorService.ts', Buffer.from(aiAdvisorServiceTs, 'utf-8'));

  // Automated Tests: attendance.test.ts
  const attendanceTestTs = `import { calculateAttendancePercentage, isStudentAtRisk } from '../src/controllers/attendanceController';

describe('Smart Campus Attendance Calculation Suite', () => {
  test('calculates 100% when all sessions attended', () => {
    expect(calculateAttendancePercentage(10, 10)).toBe(100.0);
  });

  test('calculates exact percentage correctly', () => {
    expect(calculateAttendancePercentage(8, 10)).toBe(80.0);
    expect(calculateAttendancePercentage(7, 10)).toBe(70.0);
  });

  test('handles zero sessions gracefully without division by zero', () => {
    expect(calculateAttendancePercentage(0, 0)).toBe(100.0);
  });

  test('identifies students strictly at risk below 75% threshold', () => {
    expect(isStudentAtRisk(74.9)).toBe(true);
    expect(isStudentAtRisk(70.0)).toBe(true);
    expect(isStudentAtRisk(75.0)).toBe(false);
    expect(isStudentAtRisk(88.5)).toBe(false);
  });
});
`;
  zip.addFile('backend/tests/attendance.test.ts', Buffer.from(attendanceTestTs, 'utf-8'));

  // Frontend: App.tsx
  const frontendAppTsx = `import React, { useState } from 'react';
import { AttendanceDashboard } from './components/AttendanceDashboard';
import { StudentList } from './components/StudentList';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students'>('dashboard');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <header className="flex justify-between items-center pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-indigo-400">Smart Campus Attendance & Analytics</h1>
          <p className="text-sm text-slate-400">Department of AI & Data Science</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={\`px-4 py-2 rounded-lg text-sm font-semibold \${activeTab === 'dashboard' ? 'bg-indigo-600' : 'bg-slate-800'}\`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={\`px-4 py-2 rounded-lg text-sm font-semibold \${activeTab === 'students' ? 'bg-indigo-600' : 'bg-slate-800'}\`}
          >
            Student Roster
          </button>
        </div>
      </header>
      <main className="mt-6">
        {activeTab === 'dashboard' ? <AttendanceDashboard /> : <StudentList />}
      </main>
    </div>
  );
}
export default App;
`;
  zip.addFile('frontend/src/App.tsx', Buffer.from(frontendAppTsx, 'utf-8'));

  // Frontend: AttendanceDashboard.tsx
  const dashboardTsx = `import React from 'react';

export const AttendanceDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-bold">Overall Attendance Rate</p>
          <p className="text-3xl font-extrabold text-emerald-400 mt-2">84.2%</p>
          <p className="text-xs text-slate-400 mt-1">Institutional Average</p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-bold">Total Students</p>
          <p className="text-3xl font-extrabold text-white mt-2">128</p>
          <p className="text-xs text-slate-400 mt-1">3rd Year AI & DS</p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-bold">At-Risk Students (&lt; 75%)</p>
          <p className="text-3xl font-extrabold text-amber-400 mt-2">6</p>
          <p className="text-xs text-amber-300 mt-1">Action required</p>
        </div>
        <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-bold">Active Courses</p>
          <p className="text-3xl font-extrabold text-indigo-400 mt-2">6</p>
          <p className="text-xs text-slate-400 mt-1">Current Semester</p>
        </div>
      </div>
      <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-center justify-between">
        <div>
          <h3 className="font-bold text-amber-400">Attendance Risk Threshold Notification</h3>
          <p className="text-xs text-slate-300 mt-1">6 students have fallen below the mandatory 75% threshold in Machine Learning and Computer Networks.</p>
        </div>
        <button className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs">Dispatch Warnings</button>
      </div>
    </div>
  );
};
`;
  zip.addFile('frontend/src/components/AttendanceDashboard.tsx', Buffer.from(dashboardTsx, 'utf-8'));

  // Frontend: StudentList.tsx
  const studentListTsx = `import React from 'react';

export const StudentList: React.FC = () => {
  const students = [
    { id: '1', roll: '22AI001', name: 'Aakash S', attendance: 92.4, status: 'Good' },
    { id: '2', roll: '22AI014', name: 'Deepika R', attendance: 88.0, status: 'Good' },
    { id: '3', roll: '22AI027', name: 'Karthik M', attendance: 71.5, status: 'At Risk' },
    { id: '4', roll: '22AI042', name: 'Mano Ranjith', attendance: 89.2, status: 'Good' },
    { id: '5', roll: '22AI058', name: 'Sanjay V', attendance: 68.0, status: 'At Risk' },
  ];

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700 p-4">
      <h2 className="text-lg font-bold text-white mb-4">Student Attendance Roster</h2>
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="border-b border-slate-700 text-xs uppercase text-slate-400">
          <tr>
            <th className="py-2">Roll No</th>
            <th className="py-2">Student Name</th>
            <th className="py-2">Attendance %</th>
            <th className="py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/50">
          {students.map(s => (
            <tr key={s.id}>
              <td className="py-3 font-mono">{s.roll}</td>
              <td className="py-3 font-medium text-white">{s.name}</td>
              <td className="py-3 font-bold">{s.attendance}%</td>
              <td className="py-3">
                <span className={\`px-2 py-0.5 rounded text-xs font-bold \${s.status === 'At Risk' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400'}\`}>
                  {s.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
`;
  zip.addFile('frontend/src/components/StudentList.tsx', Buffer.from(studentListTsx, 'utf-8'));

  zip.writeZip(zipPath);
  console.log(`[DemoEvidence] Source code zip generated at: ${zipPath}`);

  // ==========================================
  // 2. GENERATE PROJECT REPORT PDF
  // ==========================================
  console.log('[DemoEvidence] Generating PDF project report...');
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(reportPath);
    doc.pipe(stream);

    // Title Page
    doc.fontSize(24).font('Helvetica-Bold').text('PROJECT ASSESSMENT REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(18).font('Helvetica').text('Smart Campus Attendance & Analytics System', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Oblique').text('Department of Artificial Intelligence & Data Science', { align: 'center' });
    doc.text('Bannari Amman Institute of Technology & Research', { align: 'center' });
    doc.moveDown(1.5);

    // Metadata Table
    doc.fontSize(10).font('Helvetica-Bold').text('Project Metadata:');
    doc.font('Helvetica');
    doc.text('• Primary Author: Mano Ranjith (PRV-DEMO01)');
    doc.text('• Domain: Artificial Intelligence / Web Application');
    doc.text('• Technologies: React, TypeScript, Node.js, Express, PostgreSQL, Supabase, Prisma, Gemini API');
    doc.text('• Academic Year: 3rd Year (2025-2026)');
    doc.moveDown(1);

    // Section 1: Executive Summary
    doc.fontSize(14).font('Helvetica-Bold').text('1. Executive Summary');
    doc.font('Helvetica').fontSize(10);
    doc.text(
      'The Smart Campus Attendance & Analytics System is a comprehensive platform engineered to automate institutional attendance recording, track longitudinal attendance patterns, and trigger proactive alerts for students at risk of academic non-compliance (< 75% attendance threshold). Traditional paper-based registers and fragmented spreadsheets cause administrative latency and lack real-time visibility. This project resolves these issues by delivering role-based dashboards for students, faculty, and administrators backed by a high-throughput relational data store.'
    );
    doc.moveDown(1);

    // Section 2: Problem Statement & Proposed Solution
    doc.fontSize(14).font('Helvetica-Bold').text('2. Problem Statement & Proposed Solution');
    doc.font('Helvetica').fontSize(10);
    doc.text(
      'Problem: Faculty members spend approximately 10 minutes per class session manually verifying attendance. Furthermore, academic coordinators receive attendance summaries only at semester milestones, preventing early intervention for students at risk of detention.\n\n' +
      'Solution: A centralized web architecture connecting automated attendance capture, real-time analytics aggregation, and threshold-driven notification dispatch. Faculty record attendance via streamlined grid interfaces, while students access mobile-responsive personal dashboards to monitor their attendance standing.'
    );
    doc.moveDown(1);

    // Section 3: Architecture & System Design
    doc.fontSize(14).font('Helvetica-Bold').text('3. Architecture & Technical Design');
    doc.font('Helvetica').fontSize(10);
    doc.text(
      '• Frontend Architecture: Built with React 18 and TypeScript. Uses component-driven state architecture for responsive dashboards and attendance tables.\n' +
      '• REST API Layer: Express.js server in TypeScript enforcing schema validation, route-level authorization, and centralized error middleware.\n' +
      '• Data Persistence: PostgreSQL hosted on Supabase, managed via Prisma ORM for type-safe queries and relational integrity.\n' +
      '• AI Academic Advisory Engine: Google Gemini API integration generates personalized remedial action items for students with flagged attendance deficits.'
    );
    doc.moveDown(1);

    // Section 4: Testing & Validation
    doc.fontSize(14).font('Helvetica-Bold').text('4. Testing & Verification');
    doc.font('Helvetica').fontSize(10);
    doc.text(
      'The codebase includes automated unit test suites written in Jest. Tests validate percentage calculations, boundary conditions (such as 74.9% vs 75.0% risk flag transitions), and zero-session edge cases. Integration test suites verify endpoint status codes and database transaction isolation.'
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
  console.log(`[DemoEvidence] Project report generated at: ${reportPath}`);

  // ==========================================
  // 3. GENERATE PRESENTATION SLIDES PDF
  // ==========================================
  console.log('[DemoEvidence] Generating PDF presentation slides...');
  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    const stream = fs.createWriteStream(presentationPath);
    doc.pipe(stream);

    // Slide 1: Title Slide
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0B1120');
    doc.fillColor('#A78BFA').fontSize(28).font('Helvetica-Bold').text('Smart Campus Attendance & Analytics System', 60, 160);
    doc.fillColor('#F8FAFC').fontSize(16).font('Helvetica').text('Automated Attendance Tracking, Risk Detection & Institutional Insights', 60, 210);
    doc.fillColor('#94A3B8').fontSize(12).text('Presenter: Mano Ranjith (PRV-DEMO01) | Dept of AI & Data Science', 60, 270);
    doc.text('Bannari Amman Institute of Technology & Research', 60, 290);

    // Slide 2: Problem & Objectives
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0B1120');
    doc.fillColor('#A78BFA').fontSize(22).font('Helvetica-Bold').text('Problem Statement & Objectives', 60, 50);
    doc.fillColor('#E2E8F0').fontSize(13).font('Helvetica').text(
      '• Problem: Manual roll-calls consume 15% of instructional time and delay risk detection.\n\n' +
      '• Objective 1: Eliminate manual paper logging with instant batch attendance recording.\n' +
      '• Objective 2: Continuous visibility with real-time student and faculty dashboards.\n' +
      '• Objective 3: Automated threshold alerts (< 75% attendance) to initiate early guidance.\n' +
      '• Objective 4: Institutional analytics for department heads and accreditation compliance.',
      60, 110, { width: 700, lineGap: 8 }
    );

    // Slide 3: Tech Stack & Architecture
    doc.addPage();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#0B1120');
    doc.fillColor('#A78BFA').fontSize(22).font('Helvetica-Bold').text('Technical Architecture', 60, 50);
    doc.fillColor('#E2E8F0').fontSize(13).font('Helvetica').text(
      '• Frontend: React 18, TypeScript, TailwindCSS, Interactive Data Visualizations\n' +
      '• API Backend: Node.js, Express, TypeScript REST Endpoints\n' +
      '• Relational Database: PostgreSQL on Supabase, Prisma ORM Schema\n' +
      '• AI Remediation Engine: Google Gemini API integration for personalized student advisory\n' +
      '• Quality Assurance: Jest Unit Testing Suite for calculation and boundary validation',
      60, 110, { width: 700, lineGap: 8 }
    );

    doc.end();
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });
  console.log(`[DemoEvidence] Presentation slides generated at: ${presentationPath}`);

  const zipStat = fs.statSync(zipPath);
  const repStat = fs.statSync(reportPath);
  const presStat = fs.statSync(presentationPath);

  return {
    sourceCodePath: zipPath,
    sourceCodeName: 'smart-campus-attendance-source.zip',
    sourceCodeSize: `${(zipStat.size / 1024).toFixed(1)} KB`,
    reportPath,
    reportName: 'smart-campus-attendance-report.pdf',
    reportSize: `${(repStat.size / 1024).toFixed(1)} KB`,
    presentationPath,
    presentationName: 'smart-campus-attendance-presentation.pdf',
    presentationSize: `${(presStat.size / 1024).toFixed(1)} KB`,
  };
}

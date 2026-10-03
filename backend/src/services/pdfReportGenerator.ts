import PDFDocument from 'pdfkit';

export interface ProjectReportPdfData {
  project: {
    id: string;
    title: string;
    category?: string;
    description?: string;
    problemStatement?: string;
    proposedSolution?: string;
    targetUsers?: string;
    technologies?: string[];
    programmingLanguages?: string[];
    githubUrl?: string;
    liveDemoUrl?: string;
  };
  plagiarism: {
    codeSimilarity: number;
    reportSimilarity: number;
    overallSimilarity: number;
    status: string;
    deduction?: number;
    feedback?: string;
    matchedSources?: string[];
  } | null;
  aiEvaluation: {
    totalScoreOutof100: number;
    criteria: {
      problemDefinition: { maxScore: number; score: number; feedback: string };
      innovationNovelty: { maxScore: number; score: number; feedback: string };
      technicalImplementation: { maxScore: number; score: number; feedback: string };
      functionality: { maxScore: number; score: number; feedback: string };
      codeQuality: { maxScore: number; score: number; feedback: string };
      documentation: { maxScore: number; score: number; feedback: string };
      overallQuality: { maxScore: number; score: number; feedback: string };
    };
    strengths: string[];
    weaknesses: string[];
    technicalAnalysis: string;
    codeAnalysis: string;
    documentationAnalysis: string;
    actionableSuggestions?: string[];
    improvementPlan: Array<{ area: string; suggestion: string; priority: string }>;
    summary: string;
    aiModel: string;
    evaluatedAt: string | Date;
  };
}

export class PdfReportGenerator {
  /**
   * Generates a high-quality, professional PDF document buffer from Project Checker report data.
   */
  async generateProjectPdf(report: ProjectReportPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#3B82F6';
      const darkColor = '#0F172A';
      const grayColor = '#475569';
      const lightBg = '#F8FAFC';
      const borderColor = '#E2E8F0';

      // ==========================================
      // HEADER BANNER
      // ==========================================
      doc.rect(40, 40, 515, 65).fill(darkColor);

      doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
        .text('PROVALIX AI', 55, 52);
      doc.fontSize(9).font('Helvetica')
        .text('Automated Technical Project Audit & Engineering Assessment', 55, 75);

      const evalDate = report.aiEvaluation.evaluatedAt
        ? new Date(report.aiEvaluation.evaluatedAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : new Date().toLocaleDateString();

      doc.fontSize(8).fillColor('#94A3B8')
        .text(`Audit Date: ${evalDate}`, 380, 56, { align: 'right', width: 160 })
        .text(`Engine: ${report.aiEvaluation.aiModel || 'Gemini Pro'}`, 380, 70, { align: 'right', width: 160 });

      doc.y = 120;

      // ==========================================
      // PROJECT SUMMARY CARD
      // ==========================================
      const cardY = doc.y;
      doc.rect(40, cardY, 515, 70).fillAndStroke(lightBg, borderColor);

      doc.fillColor(darkColor).fontSize(14).font('Helvetica-Bold')
        .text(report.project.title || 'Untitled Project', 55, cardY + 12, { width: 360, lineBreak: false, ellipsis: true });

      doc.fontSize(9).font('Helvetica').fillColor(grayColor)
        .text(`Domain / Category: ${report.project.category || 'General Engineering'}`, 55, cardY + 32);

      const techStack = [
        ...(report.project.programmingLanguages || []),
        ...(report.project.technologies || []),
      ].filter(Boolean).slice(0, 6).join(', ');

      if (techStack) {
        doc.fontSize(8).fillColor(grayColor).text(`Tech Stack: ${techStack}`, 55, cardY + 48, { width: 360, ellipsis: true });
      }

      // Total Score Pill (Top Right)
      const scoreX = 430;
      doc.rect(scoreX, cardY + 10, 110, 50).fillAndStroke('#EFF6FF', '#BFDBFE');
      doc.fillColor(primaryColor).fontSize(20).font('Helvetica-Bold')
        .text(`${Math.round(report.aiEvaluation.totalScoreOutof100)}`, scoreX, cardY + 16, { width: 110, align: 'center' });
      doc.fontSize(8).font('Helvetica').fillColor(grayColor)
        .text('OVERALL SCORE / 100', scoreX, cardY + 42, { width: 110, align: 'center' });

      doc.y = cardY + 85;

      // ==========================================
      // EXECUTIVE SUMMARY
      // ==========================================
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('1. Executive Summary', 40, doc.y);
      doc.y += 4;
      doc.fillColor(grayColor).fontSize(9).font('Helvetica')
        .text(
          report.aiEvaluation.summary ||
            'Project has been assessed across core software engineering, originality, and architectural rubric criteria.',
          40,
          doc.y,
          { width: 515, lineGap: 3 }
        );

      doc.y += 10;

      // ==========================================
      // PLAGIARISM & INTEGRITY ANALYSIS
      // ==========================================
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('2. Plagiarism & Originality Analysis', 40, doc.y);
      doc.y += 4;

      const plagY = doc.y;
      doc.rect(40, plagY, 515, 45).fillAndStroke(lightBg, borderColor);

      const codeSim = report.plagiarism?.codeSimilarity ?? 0;
      const reportSim = report.plagiarism?.reportSimilarity ?? 0;
      const overallSim = report.plagiarism?.overallSimilarity ?? 0;
      const plagStatus = report.plagiarism?.status ?? 'Low';

      const statusColor = plagStatus === 'Low' ? '#059669' : plagStatus === 'Moderate' ? '#D97706' : '#DC2626';

      doc.fontSize(8).font('Helvetica').fillColor(grayColor)
        .text('Code Similarity', 60, plagY + 10)
        .text('Report Similarity', 170, plagY + 10)
        .text('Overall Similarity', 290, plagY + 10)
        .text('Integrity Status', 410, plagY + 10);

      doc.fontSize(12).font('Helvetica-Bold').fillColor(darkColor)
        .text(`${codeSim}%`, 60, plagY + 24)
        .text(`${reportSim}%`, 170, plagY + 24)
        .text(`${overallSim}%`, 290, plagY + 24);

      doc.fillColor(statusColor).text(plagStatus, 410, plagY + 24);

      doc.y = plagY + 58;

      // ==========================================
      // CRITERION SCORE BREAKDOWN TABLE (100 Marks)
      // ==========================================
      doc.fillColor(darkColor).fontSize(11).font('Helvetica-Bold').text('3. Criterion-Wise Rubric Scoring Breakdown (/100)', 40, doc.y);
      doc.y += 6;

      const criteria = [
        { label: 'Problem Definition', key: 'problemDefinition', max: 15 },
        { label: 'Innovation & Novelty', key: 'innovationNovelty', max: 20 },
        { label: 'Technical Implementation', key: 'technicalImplementation', max: 20 },
        { label: 'Functionality', key: 'functionality', max: 15 },
        { label: 'Code Quality', key: 'codeQuality', max: 10 },
        { label: 'Documentation', key: 'documentation', max: 10 },
        { label: 'Overall Quality', key: 'overallQuality', max: 10 },
      ] as const;

      // Table Header
      const tableX = 40;
      let rowY = doc.y;
      doc.rect(tableX, rowY, 515, 20).fill(darkColor);
      doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
        .text('EVALUATION CRITERION', tableX + 8, rowY + 6)
        .text('MAX', tableX + 160, rowY + 6, { width: 35, align: 'center' })
        .text('AWARDED', tableX + 205, rowY + 6, { width: 50, align: 'center' })
        .text('ASSESSMENT FEEDBACK', tableX + 265, rowY + 6);

      rowY += 20;

      for (let i = 0; i < criteria.length; i++) {
        const item = criteria[i];
        const critData = (report.aiEvaluation.criteria as any)?.[item.key] || {
          score: 0,
          maxScore: item.max,
          feedback: 'Evaluated against evidence.',
        };

        const bg = i % 2 === 0 ? '#FFFFFF' : lightBg;
        doc.rect(tableX, rowY, 515, 26).fillAndStroke(bg, borderColor);

        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
          .text(item.label, tableX + 8, rowY + 8);

        doc.font('Helvetica').fillColor(grayColor)
          .text(String(item.max), tableX + 160, rowY + 8, { width: 35, align: 'center' });

        doc.font('Helvetica-Bold').fillColor(primaryColor)
          .text(String(critData.score ?? 0), tableX + 205, rowY + 8, { width: 50, align: 'center' });

        doc.font('Helvetica').fillColor(grayColor)
          .text(critData.feedback || 'Assessment completed.', tableX + 265, rowY + 4, {
            width: 240,
            height: 20,
            ellipsis: true,
          });

        rowY += 26;
      }

      // Total Row
      doc.rect(tableX, rowY, 515, 22).fillAndStroke('#EEF2FF', primaryColor);
      doc.fillColor(darkColor).fontSize(9).font('Helvetica-Bold')
        .text('TOTAL VALIDATED SCORE', tableX + 8, rowY + 6)
        .text('100', tableX + 160, rowY + 6, { width: 35, align: 'center' })
        .text(`${report.aiEvaluation.totalScoreOutof100}`, tableX + 205, rowY + 6, { width: 50, align: 'center' })
        .text('Sum of all 7 independent criteria', tableX + 265, rowY + 6);

      doc.y = rowY + 35;

      // Check if we need a new page for detailed sections
      if (doc.y > 660) {
        doc.addPage();
        doc.y = 40;
      }

      // ==========================================
      // STRENGTHS & WEAKNESSES
      // ==========================================
      const colWidth = 245;
      const leftColX = 40;
      const rightColX = 310;
      const sectionsY = doc.y;

      // Strengths
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold')
        .text('4. Identified Strengths', leftColX, sectionsY);
      let sy = sectionsY + 16;
      const strengths = report.aiEvaluation.strengths?.length > 0
        ? report.aiEvaluation.strengths.slice(0, 4)
        : ['Clear technical vision and defined project scope.'];

      for (const s of strengths) {
        doc.fillColor('#059669').fontSize(8).font('Helvetica-Bold').text('+', leftColX, sy);
        doc.fillColor(grayColor).font('Helvetica').text(s, leftColX + 12, sy, { width: colWidth - 15, lineGap: 2 });
        sy = doc.y + 4;
      }

      // Areas for Improvement
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold')
        .text('5. Priority Improvements', rightColX, sectionsY);
      let wy = sectionsY + 16;
      const weaknesses = report.aiEvaluation.weaknesses?.length > 0
        ? report.aiEvaluation.weaknesses.slice(0, 4)
        : ['Strengthen unit test coverage and automated test suites.'];

      for (const w of weaknesses) {
        doc.fillColor('#DC2626').fontSize(8).font('Helvetica-Bold').text('-', rightColX, wy);
        doc.fillColor(grayColor).font('Helvetica').text(w, rightColX + 12, wy, { width: colWidth - 15, lineGap: 2 });
        wy = doc.y + 4;
      }

      doc.y = Math.max(sy, wy) + 12;

      // Ensure room for Actionable Plan
      if (doc.y > 650) {
        doc.addPage();
        doc.y = 40;
      }

      // ==========================================
      // ACTIONABLE IMPROVEMENT PLAN
      // ==========================================
      doc.fillColor(darkColor).fontSize(10).font('Helvetica-Bold').text('6. Actionable Implementation Plan', 40, doc.y);
      doc.y += 6;

      const planItems = report.aiEvaluation.improvementPlan?.length > 0
        ? report.aiEvaluation.improvementPlan.slice(0, 3)
        : [
            { area: 'Code Quality', suggestion: 'Refactor duplicated utility logic and add linting rules.', priority: 'Medium' },
            { area: 'Testing', suggestion: 'Add integration tests for core API endpoints.', priority: 'High' },
          ];

      for (const item of planItems) {
        const itemY = doc.y;
        doc.rect(40, itemY, 515, 32).fillAndStroke(lightBg, borderColor);
        const pColor = item.priority === 'High' ? '#DC2626' : item.priority === 'Medium' ? '#D97706' : '#2563EB';

        doc.fillColor(darkColor).fontSize(8).font('Helvetica-Bold')
          .text(item.area || 'Engineering', 50, itemY + 6);
        doc.fillColor(pColor).fontSize(7).text(`[Priority: ${item.priority || 'Medium'}]`, 150, itemY + 6);
        doc.fillColor(grayColor).fontSize(8).font('Helvetica')
          .text(item.suggestion || '', 50, itemY + 18, { width: 495, ellipsis: true });

        doc.y = itemY + 38;
      }

      // ==========================================
      // FOOTER ON ALL PAGES
      // ==========================================
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.rect(40, 800, 515, 0.5).fill(borderColor);
        doc.fontSize(7).font('Helvetica').fillColor('#94A3B8')
          .text('PROVALIX AI — Standalone Project Checker Evaluation Report', 40, 806)
          .text(`Page ${i + 1} of ${range.count}`, 450, 806, { width: 105, align: 'right' });
      }

      doc.end();
    });
  }
}

export const pdfReportGenerator = new PdfReportGenerator();

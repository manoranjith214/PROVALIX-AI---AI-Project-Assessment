import { prisma } from '../src/config/prisma';
import { projectCheckerService } from '../src/services/projectCheckerService';

describe('Demo Account Evaluation & Report Data Flow Verification', () => {
  jest.setTimeout(30000);
  const DEMO_EMAIL = 'demo@provalix.ai';
  let demoUser: any;
  let demoProject: any;

  beforeAll(async () => {
    demoUser = await prisma.user.findFirst({
      where: { email: DEMO_EMAIL },
    });
    expect(demoUser).toBeDefined();

    demoProject = await prisma.projectCheckerProject.findFirst({
      where: {
        userId: demoUser.id,
        title: 'Smart Campus Attendance & Analytics System',
      },
      include: {
        resources: true,
        aiEvaluation: true,
        plagiarism: true,
      },
    });
    expect(demoProject).toBeDefined();
  });

  test('1. Database holds exact 7-criteria AI evaluation that mathematically sums to 63', async () => {
    const ai = demoProject.aiEvaluation;
    expect(ai).toBeDefined();

    expect(ai.problemDefinitionScore).toBe(12);
    expect(ai.innovationNoveltyScore).toBe(11);
    expect(ai.technicalImplementationScore).toBe(12);
    expect(ai.functionalityScore).toBe(9);
    expect(ai.codeQualityScore).toBe(7);
    expect(ai.documentationScore).toBe(6);
    expect(ai.overallQualityScore).toBe(6);

    const sum =
      ai.problemDefinitionScore +
      ai.innovationNoveltyScore +
      ai.technicalImplementationScore +
      ai.functionalityScore +
      ai.codeQualityScore +
      ai.documentationScore +
      ai.overallQualityScore;

    expect(sum).toBe(63);
    expect(ai.totalScore).toBe(63);
  });

  test('2. Database holds genuine plagiarism result (0% clean)', async () => {
    const plag = demoProject.plagiarism;
    expect(plag).toBeDefined();
    expect(plag.overallSimilarity).toBe(0);
    expect(plag.codeSimilarity).toBe(0);
    expect(plag.reportSimilarity).toBe(0);
  });

  test('3. Project Checker list service returns score 63 and similarity 0', async () => {
    const result = await projectCheckerService.listUserProjects(demoUser.id);
    expect(result.projects.length).toBeGreaterThanOrEqual(1);

    const proj = result.projects.find((p: any) => p.id === demoProject.id);
    expect(proj).toBeDefined();
    expect(proj!.overallScore).toBe(63);
    expect(proj!.similarityScore).toBe(0);
    expect(proj!.aiEvaluation?.totalScore).toBe(63);
  });

  test('4. Project Checker getReport service returns consistent score 63 and complete 7-criteria breakdown', async () => {
    const report = await projectCheckerService.getReport(demoProject.id, demoUser.id);
    expect(report).toBeDefined();

    // Top level
    expect(report.overallScore).toBe(63);
    expect(report.similarityScore).toBe(0);

    // Inside project
    expect(report.project.overallScore).toBe(63);
    expect(report.project.similarityScore).toBe(0);

    // Inside aiEvaluation & evaluation
    expect(report.aiEvaluation).toBeDefined();
    expect(report.evaluation).toBeDefined();
    expect(report.aiEvaluation.overallScore).toBe(63);
    expect(report.aiEvaluation.totalScore).toBe(63);

    // 7 Criteria validation
    const c = report.aiEvaluation.criteria;
    expect(c.problemDefinition.obtainedScore).toBe(12);
    expect(c.problemDefinition.maxScore).toBe(15);

    expect(c.innovationNovelty.obtainedScore).toBe(11);
    expect(c.innovationNovelty.maxScore).toBe(20);

    expect(c.technicalImplementation.obtainedScore).toBe(12);
    expect(c.technicalImplementation.maxScore).toBe(20);

    expect(c.functionality.obtainedScore).toBe(9);
    expect(c.functionality.maxScore).toBe(15);

    expect(c.codeQuality.obtainedScore).toBe(7);
    expect(c.codeQuality.maxScore).toBe(10);

    expect(c.documentation.obtainedScore).toBe(6);
    expect(c.documentation.maxScore).toBe(10);

    expect(c.overallQuality.obtainedScore).toBe(6);
    expect(c.overallQuality.maxScore).toBe(10);

    const criteriaSum =
      c.problemDefinition.obtainedScore +
      c.innovationNovelty.obtainedScore +
      c.technicalImplementation.obtainedScore +
      c.functionality.obtainedScore +
      c.codeQuality.obtainedScore +
      c.documentation.obtainedScore +
      c.overallQuality.obtainedScore;

    expect(criteriaSum).toBe(63);
  });

  test('5. public.project_reports table in Supabase Postgres is synchronized with score 63', async () => {
    const reports: any[] = await prisma.$queryRawUnsafe(
      'SELECT id, project_title, score, similarity, report_data FROM public.project_reports WHERE id = $1::uuid',
      demoProject.id
    );

    expect(reports.length).toBe(1);
    const r = reports[0];
    expect(Number(r.score)).toBe(63);
    expect(Number(r.similarity)).toBe(0);
    expect(r.report_data.evaluation).toBeDefined();
    expect(r.report_data.evaluation.overallScore).toBe(63);
    expect(r.report_data.evaluation.criteria.problemDefinition.obtainedScore).toBe(12);
  });
});

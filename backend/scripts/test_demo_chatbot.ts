import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { prisma } from '../src/config/prisma';

async function testDemoChatbot() {
  console.log('====================================================');
  console.log('PROVALIX AI - DEMO CHATBOT VERIFICATION');
  console.log('====================================================\n');

  const demoUser = await prisma.user.findUnique({
    where: { email: 'demo@provalix.ai' },
  });

  if (!demoUser) {
    throw new Error('Demo user demo@provalix.ai not found. Please run seedDemo.ts first.');
  }

  const demoProject = await prisma.projectCheckerProject.findFirst({
    where: { userId: demoUser.id },
  });

  const demoSubmission = await prisma.submission.findFirst({
    where: { submitterId: demoUser.id },
  });

  console.log(`Demo User ID: ${demoUser.id} (${demoUser.permanentId})`);
  console.log(`Demo Project ID: ${demoProject?.id || 'none'}`);
  console.log(`Demo Submission ID: ${demoSubmission?.id || 'none'}\n`);

  const questions = [
    {
      num: 1,
      title: 'What is Provalix AI?',
      message: 'What is Provalix AI?',
      expectGeneral: true,
      context: undefined,
    },
    {
      num: 2,
      title: 'Explain DBMS normalization.',
      message: 'Explain DBMS normalization.',
      expectGeneral: true,
      context: undefined,
    },
    {
      num: 3,
      title: 'How can I improve my project score?',
      message: 'How can I improve my project score?',
      expectGeneral: false,
      context: { projectId: demoProject?.id },
    },
    {
      num: 4,
      title: 'Explain my current project evaluation.',
      message: 'Explain my current project evaluation.',
      expectGeneral: false,
      context: { projectId: demoProject?.id },
    },
    {
      num: 5,
      title: 'What is the difference between React and Angular?',
      message: 'What is the difference between React and Angular?',
      expectGeneral: true,
      context: undefined,
    },
    {
      num: 6,
      title: 'Explain Python decorators.',
      message: 'Explain Python decorators.',
      expectGeneral: true,
      context: undefined,
    },
    {
      num: 7,
      title: 'Why did I lose marks in code quality?',
      message: 'Why did I lose marks in code quality?',
      expectGeneral: false,
      context: { projectId: demoProject?.id },
    },
    {
      num: 8,
      title: 'Tamil Question: கணினி வலையமைப்பு (Computer Networks) என்றால் என்ன? தமிழில் விளக்குக.',
      message: 'கணினி வலையமைப்பு (Computer Networks) என்றால் என்ன? தமிழில் விளக்குக.',
      expectGeneral: true,
      context: undefined,
    },
    {
      num: 9,
      title: 'Tanglish Question: Database la indexing epdi work aagudhu? Short ah explain pannunga.',
      message: 'Database la indexing epdi work aagudhu? Short ah explain pannunga.',
      expectGeneral: true,
      context: undefined,
    },
  ];

  const results: Array<{ num: number; question: string; responseSnippet: string; success: boolean }> = [];

  for (const q of questions) {
    console.log(`----------------------------------------------------`);
    console.log(`Question ${q.num}: "${q.title}"`);
    console.log(`Sending message: "${q.message}"`);

    const start = Date.now();
    try {
      const res = await chatbotService.processMessage(demoUser.id, {
        message: q.message,
        projectId: q.context?.projectId,
        context: q.context,
      });

      const elapsed = Date.now() - start;
      const reply = res.message || '';
      const snippet = reply.replace(/\n+/g, ' ').slice(0, 150) + (reply.length > 150 ? '...' : '');

      console.log(`✅ Status: 200 OK (${elapsed}ms)`);
      console.log(`   Response: "${snippet}"`);
      if (res.sources && res.sources.length > 0) {
        console.log(`   Sources: ${res.sources.map((s: any) => s.title).join(', ')}`);
      }

      results.push({
        num: q.num,
        question: q.message,
        responseSnippet: snippet,
        success: reply.length > 20,
      });

      // Pause 2 seconds between questions to respect Google AI Studio rate limits
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err: any) {
      console.error(`❌ Failed:`, err?.message || err);
      results.push({
        num: q.num,
        question: q.message,
        responseSnippet: `Error: ${err?.message || err}`,
        success: false,
      });
    }
  }

  console.log('\n====================================================');
  console.log('CHATBOT VERIFICATION SUMMARY:');
  console.log('====================================================');
  results.forEach((r) => {
    console.log(`[Q${r.num}] ${r.success ? '✅ PASS' : '❌ FAIL'}: ${r.question}`);
  });

  const allPassed = results.every((r) => r.success);
  console.log(`\nOverall Result: ${allPassed ? 'ALL 9 QUESTIONS PASSED' : 'SOME QUESTIONS FAILED'}`);

  return results;
}

if (require.main === module) {
  testDemoChatbot()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

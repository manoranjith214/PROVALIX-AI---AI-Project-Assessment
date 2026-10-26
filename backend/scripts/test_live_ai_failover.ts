import { aiService } from '../src/services/aiService';

async function main() {
  console.log('=== TEST LIVE AI FAILOVER ===');
  const start = Date.now();
  try {
    const res = await aiService.generateChatResponse({
      userId: 'test-user',
      userMessage: 'What is database normalization in one sentence?',
      detectedIntent: 'ACADEMIC',
      detectedLanguage: 'english',
    });
    console.log(`\n✅ TEST PASSED in ${Date.now() - start}ms!\nAI Response:\n"${res}"\n`);
    process.exit(0);
  } catch (err: any) {
    console.error(`\n❌ TEST FAILED in ${Date.now() - start}ms:`, err?.message || err);
    process.exit(1);
  }
}

main();

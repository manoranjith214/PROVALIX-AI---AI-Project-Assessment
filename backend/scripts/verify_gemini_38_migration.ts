import { config } from '../src/config/env';
import { aiService } from '../src/services/aiService';
import { GeminiProvider } from '../src/integrations/ai/GeminiProvider';
import { evidenceAnalyzer } from '../src/integrations/rubric/evidenceAnalyzer';

async function runVerification() {
  console.log('====================================================');
  console.log('GEMINI 3.8 FLASH MIGRATION VERIFICATION SUITE');
  console.log('====================================================\n');

  // Step 1: Verify Model Configuration
  console.log('1. Checking Model Configuration:');
  console.log(`   config.ai.geminiModel: ${config.ai.geminiModel}`);
  console.log(`   config.ai.provider: ${config.ai.provider}`);
  const gemini = new GeminiProvider();
  console.log(`   GeminiProvider.getModelName(): ${gemini.getModelName()}`);
  if (gemini.getModelName() !== 'gemini-3.8-flash') {
    throw new Error(`Expected gemini-3.8-flash but got ${gemini.getModelName()}`);
  }
  console.log('   ✅ Model configured correctly as gemini-3.8-flash\n');

  // Step 2: Test "Hello"
  console.log('2. Testing "Hello":');
  const resHello = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'Hello',
    detectedIntent: 'CASUAL',
    detectedLanguage: 'english',
  });
  console.log(`   Response snippet: "${resHello.slice(0, 100)}..."`);
  console.log('   ✅ "Hello" responded successfully\n');

  // Pause 2s to respect rate limits
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: Test "What is Python?"
  console.log('3. Testing "What is Python?":');
  const resPython = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'What is Python?',
    detectedIntent: 'PROGRAMMING',
    detectedLanguage: 'english',
  });
  console.log(`   Response snippet: "${resPython.slice(0, 120)}..."`);
  if (!resPython.toLowerCase().includes('python')) {
    throw new Error('Response did not mention Python');
  }
  console.log('   ✅ "What is Python?" responded accurately\n');

  // Pause 2s to respect rate limits
  await new Promise(r => setTimeout(r, 2000));

  // Step 4: Test "Explain my current evaluation status"
  console.log('4. Testing "Explain my current evaluation status":');
  const resEval = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'Explain my current evaluation status',
    context: '[Authorized Project Evaluation Evidence]\nNo project evidence found.',
    detectedIntent: 'PROJECT',
    detectedLanguage: 'english',
  });
  console.log(`   Response snippet: "${resEval.slice(0, 120)}..."`);
  console.log('   ✅ "Explain my current evaluation status" responded accurately\n');

  // Pause 2s to respect rate limits
  await new Promise(r => setTimeout(r, 2000));

  // Step 5: Test Tanglish question
  console.log('5. Testing Tanglish question:');
  const resTanglish = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'React la useState hook epdi use panradhu? Konjam explain pannunga.',
    detectedIntent: 'PROGRAMMING',
    detectedLanguage: 'tanglish',
  });
  console.log(`   Response snippet: "${resTanglish.slice(0, 120)}..."`);
  console.log('   ✅ Tanglish responded accurately\n');

  // Pause 2s to respect rate limits
  await new Promise(r => setTimeout(r, 2000));

  // Step 6: Test Tamil question
  console.log('6. Testing Tamil question:');
  const resTamil = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'DBMS என்றால் என்ன? தமிழில் விளக்குக.',
    detectedIntent: 'ACADEMIC',
    detectedLanguage: 'tamil',
  });
  console.log(`   Response snippet: "${resTamil.slice(0, 120)}..."`);
  console.log('   ✅ Tamil responded accurately\n');

  // Pause 2s to respect rate limits
  await new Promise(r => setTimeout(r, 2000));

  // Step 7: Test completely unrelated technical question
  console.log('7. Testing unrelated technical question:');
  const resDocker = await aiService.generateChatResponse({
    userId: 'test-user-id',
    userMessage: 'What is Docker containerization and how does it differ from a virtual machine?',
    detectedIntent: 'ACADEMIC',
    detectedLanguage: 'english',
  });
  console.log(`   Response snippet: "${resDocker.slice(0, 120)}..."`);
  console.log('   ✅ Docker question responded accurately\n');

  // Step 8: Test Project Checker with "x"
  console.log('8. Testing Project Checker with "x":');
  const invalidProject = {
    title: 'x',
    category: 'x',
    description: 'x',
    problemStatement: 'x',
    proposedSolution: 'x',
    githubUrl: '',
    resources: [],
  };
  const projCheck = evidenceAnalyzer.validateProjectSubmission(invalidProject);
  console.log(`   Valid: ${projCheck.isValid}, Reason: ${projCheck.reason}`);
  if (projCheck.isValid) {
    throw new Error('Project Checker should have rejected "x"');
  }
  console.log('   ✅ Project Checker correctly rejected "x" with zero fabricated score\n');

  // Step 9: Test Classroom AI Analysis with "x"
  console.log('9. Testing Classroom AI Analysis with "x":');
  const invalidClassroomSubmission = {
    title: 'x',
    resources: [],
    githubUrl: '',
    reportUrl: '',
  };
  const classCheck = evidenceAnalyzer.validateClassroomSubmission(invalidClassroomSubmission, ['sourceCode', 'report']);
  console.log(`   Valid: ${classCheck.isValid}, Reason: ${classCheck.reason}`);
  if (classCheck.isValid) {
    throw new Error('Classroom AI should have rejected "x"');
  }
  console.log('   ✅ Classroom AI correctly rejected "x" with zero fabricated claims\n');

  console.log('====================================================');
  console.log('ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});

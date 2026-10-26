import { chatbotService } from '../src/integrations/chatbot/ChatbotService';
import { prisma } from '../src/config/prisma';

async function testRealChatbot() {
  console.log('=== VERIFYING REAL CHATBOT REQUEST WITH DATABASE PERSISTENCE ===');
  
  const user = await prisma.user.findFirst();
  if (!user) {
    throw new Error('No user found in database to test chatbot');
  }
  console.log(`Using real database user: ${user.name} (${user.email}) [ID: ${user.id}]`);

  const startTime = Date.now();
  const testMessage = 'What is Provalix AI and how does it evaluate projects?';

  try {
    const result = await chatbotService.processMessage(user.id, {
      message: testMessage,
    });

    console.log(`\nChatbot call completed in ${Date.now() - startTime}ms`);
    console.log(`Conversation ID: ${result.conversationId}`);
    console.log(`AI Response Message:\n"${result.message.slice(0, 200)}..."\n`);
    console.log(`Sources returned: ${result.sources.length}`);

    // Verify DB persistence
    const savedConv = await prisma.chatConversation.findUnique({
      where: { id: result.conversationId },
      include: { messages: true },
    });

    if (!savedConv) {
      throw new Error(`Conversation ${result.conversationId} not found in database!`);
    }

    console.log(`Database records confirmed:`);
    console.log(`- Conversation title: "${savedConv.title}"`);
    console.log(`- Total messages stored: ${savedConv.messages.length}`);
    for (const msg of savedConv.messages) {
      console.log(`  * [${msg.role}]: "${msg.message.slice(0, 80)}..."`);
    }

    if (savedConv.messages.length < 2) {
      throw new Error('Expected at least 2 messages (user + assistant) in database');
    }

    console.log('\n✅ REAL CHATBOT REQUEST & PERSISTENCE VERIFIED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('\n❌ REAL CHATBOT REQUEST FAILED:', err?.message || err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRealChatbot();

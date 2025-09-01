/**
 * Yuri AI API Unit Test
 * Tests the Friendli AI integration with Yuri model
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText } from 'ai';

// Friendli AI configuration (from Discord bot)
const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1';
const FRIENDLI_MODEL = 'dep86pjolcjjnv8';

// Create Friendli provider
const friendli = createOpenAI({
  apiKey: FRIENDLI_API_KEY,
  baseURL: FRIENDLI_BASE_URL,
});

// Test cases
async function runTests() {
  console.log('=== Yuri AI API Unit Tests ===\n');
  
  // Test 1: Basic connection test
  console.log('Test 1: Basic Connection Test');
  console.log('Testing Friendli AI connection...');
  try {
    const result = await generateText({
      model: friendli(FRIENDLI_MODEL),
      prompt: '안녕하세요! 당신은 누구인가요?',
      maxTokens: 100,
    });
    console.log('✅ Connection successful');
    console.log('Response:', result.text.substring(0, 100) + '...\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
    return;
  }

  // Test 2: Korean language test
  console.log('Test 2: Korean Language Test');
  try {
    const result = await generateText({
      model: friendli(FRIENDLI_MODEL),
      system: '당신의 이름은 Yuri(유리)입니다. 한국어로 대답해주세요.',
      prompt: '오늘 날씨가 어떤가요?',
      maxTokens: 150,
    });
    console.log('✅ Korean response:', result.text.substring(0, 150) + '...\n');
  } catch (error) {
    console.error('❌ Korean test failed:', error.message);
  }

  // Test 3: English language test
  console.log('Test 3: English Language Test');
  try {
    const result = await generateText({
      model: friendli(FRIENDLI_MODEL),
      system: 'Your name is Yuri. Please respond in English.',
      prompt: 'What can you help me with today?',
      maxTokens: 150,
    });
    console.log('✅ English response:', result.text.substring(0, 150) + '...\n');
  } catch (error) {
    console.error('❌ English test failed:', error.message);
  }

  // Test 4: Streaming test
  console.log('Test 4: Streaming Response Test');
  try {
    const result = streamText({
      model: friendli(FRIENDLI_MODEL),
      system: '당신은 Yuri(유리)입니다.',
      messages: [
        { role: 'user', content: '자기소개를 짧게 해주세요.' }
      ],
      maxTokens: 100,
    });

    console.log('Streaming response:');
    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
      process.stdout.write(chunk);
    }
    console.log('\n✅ Streaming test successful\n');
  } catch (error) {
    console.error('❌ Streaming test failed:', error.message);
  }

  // Test 5: Multi-turn conversation test
  console.log('Test 5: Multi-turn Conversation Test');
  try {
    const result = await generateText({
      model: friendli(FRIENDLI_MODEL),
      system: '당신은 Yuri(유리)입니다. 친근하고 도움이 되는 AI 어시스턴트입니다.',
      messages: [
        { role: 'user', content: '안녕하세요! 저는 개발자입니다.' },
        { role: 'assistant', content: '안녕하세요! 개발자님, 만나서 반갑습니다. 저는 AI 어시스턴트 유리입니다. 어떤 개발 분야에서 일하고 계신가요?' },
        { role: 'user', content: '웹 개발을 하고 있어요. Next.js를 사용합니다.' }
      ],
      maxTokens: 200,
    });
    console.log('✅ Multi-turn response:', result.text.substring(0, 200) + '...\n');
  } catch (error) {
    console.error('❌ Multi-turn test failed:', error.message);
  }

  // Test 6: Response time test
  console.log('Test 6: Response Time Test');
  const startTime = Date.now();
  try {
    await generateText({
      model: friendli(FRIENDLI_MODEL),
      prompt: 'Hello',
      maxTokens: 10,
    });
    const responseTime = Date.now() - startTime;
    console.log(`✅ Response time: ${responseTime}ms\n`);
  } catch (error) {
    console.error('❌ Response time test failed:', error.message);
  }

  console.log('=== Test Summary ===');
  console.log('Model: Friendli AI - dep86pjolcjjnv8 (Original Yuri from Discord)');
  console.log('API Endpoint:', FRIENDLI_BASE_URL);
  console.log('All tests completed!\n');
}

// Run tests
console.log('Starting Yuri AI API tests...\n');
runTests().catch(console.error);
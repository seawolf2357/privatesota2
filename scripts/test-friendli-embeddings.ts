// Test if Friendli AI supports embeddings API

const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1';

async function testFriendliEmbeddings() {
  console.log('[Test] Testing Friendli AI embeddings API...\n');

  try {
    // Test 1: OpenAI-compatible embeddings endpoint
    console.log('[Test] Trying OpenAI-compatible format (/embeddings)...');
    const response1 = await fetch(`${FRIENDLI_BASE_URL}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
      },
      body: JSON.stringify({
        input: 'Hello, world!',
        model: 'dep86pjolcjjnv8', // Current chat model
      }),
    });

    console.log('Status:', response1.status);
    const text1 = await response1.text();
    console.log('Response:', text1.substring(0, 200));

    if (response1.ok) {
      console.log('\n✅ SUCCESS! Friendli AI supports embeddings!');
      const data = JSON.parse(text1);
      console.log('Embedding dimensions:', data.data?.[0]?.embedding?.length || 'unknown');
      process.exit(0);
    }

    // Test 2: Check available models
    console.log('\n[Test] Checking available models...');
    const response2 = await fetch(`${FRIENDLI_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
      },
    });

    const models = await response2.json();
    console.log('Available models:', JSON.stringify(models, null, 2));

  } catch (error) {
    console.error('[Test] Error:', error);
  }

  console.log('\n❌ Friendli AI does not support embeddings API');
  console.log('Need to use alternative embedding solution');
  process.exit(1);
}

testFriendliEmbeddings();

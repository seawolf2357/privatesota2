/**
 * Yuri AI Direct API Test
 * Direct HTTP test for Friendli AI API
 */

const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
const FRIENDLI_MODEL = 'dep86pjolcjjnv8';

async function testFriendliAPI() {
  console.log('=== Yuri AI Direct API Test ===\n');
  console.log('API Endpoint:', FRIENDLI_BASE_URL);
  console.log('Model:', FRIENDLI_MODEL);
  console.log('Testing...\n');

  const payload = {
    model: FRIENDLI_MODEL,
    messages: [
      {
        role: 'system',
        content: '당신의 이름은 Yuri(유리)입니다. 한국어와 영어를 유창하게 구사하는 친근한 AI 어시스턴트입니다.'
      },
      {
        role: 'user',
        content: '안녕하세요! 자기소개를 간단히 해주세요.'
      }
    ],
    max_tokens: 200,
    temperature: 0.8,
    stream: false
  };

  try {
    console.log('Sending request to Friendli AI...');
    
    const response = await fetch(FRIENDLI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success! Response received:');
    console.log('---');
    
    if (data.choices && data.choices[0]) {
      console.log('Yuri says:', data.choices[0].message.content);
      console.log('---');
      console.log('Usage:', data.usage);
    } else {
      console.log('Full response:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.error('Error details:', error);
  }

  // Test streaming
  console.log('\n=== Testing Streaming Response ===\n');
  
  const streamPayload = {
    ...payload,
    stream: true,
    messages: [
      {
        role: 'user',
        content: 'Tell me a very short joke in Korean.'
      }
    ]
  };

  try {
    const response = await fetch(FRIENDLI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(streamPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Streaming API Error:', errorText);
      return;
    }

    console.log('Streaming response:');
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                process.stdout.write(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    }
    
    console.log('\n\n✅ Streaming test complete!');
    
  } catch (error) {
    console.error('❌ Streaming request failed:', error.message);
  }

  console.log('\n=== Test Complete ===');
}

// Run test
testFriendliAPI().catch(console.error);
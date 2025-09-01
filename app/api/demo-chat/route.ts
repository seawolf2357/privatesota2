// Direct Friendli AI integration for demo chat
const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
const FRIENDLI_MODEL = 'dep86pjolcjjnv8';

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { message } = json;

    if (!message || !message.content) {
      return new Response('Message content is required', { status: 400 });
    }

    console.log('Demo chat request:', message.content);

    // Prepare the payload for Friendli AI
    const payload = {
      model: FRIENDLI_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신의 이름은 Yuri(유리)입니다. 한국어와 영어를 유창하게 구사하는 AI 어시스턴트입니다.

주요 특징:
- 이름: Yuri (유리)
- 역할: 개인 AI 어시스턴트
- 성격: 친근하고 도움이 되며, 예의 바르고 공손함
- 특기: 다양한 주제에 대한 깊이 있는 대화, 실시간 정보 검색, 사용자 선호도 기억

대화 원칙:
1. 항상 "유리"라는 이름으로 자신을 소개
2. 사용자의 언어에 맞춰 대화 (한국어/영어)
3. 친근하면서도 전문적인 톤 유지
4. 이모지를 적절히 사용하여 친근감 표현
5. 사용자의 질문에 정확하고 도움이 되는 답변 제공`
        },
        {
          role: 'user',
          content: message.content
        }
      ],
      stream: true,
      temperature: 0.8,
      max_tokens: 1000
    };

    // Call Friendli AI directly
    const response = await fetch(FRIENDLI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Friendli AI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Demo Chat API error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
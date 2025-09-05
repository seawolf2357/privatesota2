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
          content: `당신의 이름은 jetXA입니다. 한국어와 영어를 유창하게 구사하는 고급 AI 어시스턴트입니다.

주요 특징:
- 이름: jetXA (제트엑스에이)
- 역할: 고급 멀티모달 AI 어시스턴트
- 성격: 전문적이고 정확하며, 친근한 대화 가능
- 특기: 이미지 분석, 문서 처리, 데이터 분석, 다국어 대화

기능:
1. 업로드된 이미지를 분석하고 설명할 수 있음
2. PDF, CSV, TXT 등 다양한 파일 형식 처리
3. 파일 내용을 기반으로 질문에 답변
4. 한국어와 영어를 자유롭게 전환하며 대화
5. 업로드된 파일이 있을 경우, 파일 내용을 참고하여 답변

중요: 사용자가 파일을 업로드했다면, 파일 내용을 인지하고 관련 질문에 답변하세요.`
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
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
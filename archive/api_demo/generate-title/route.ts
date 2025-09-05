import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  let body: any = {};
  
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    body = await request.json();
    const { text } = body;

    console.log('Generating title for text:', text?.slice(0, 100));

    if (!text || text.trim().length === 0) {
      console.log('No text provided, using fallback');
      return NextResponse.json({ title: '새 대화' });
    }

    // Friendli AI를 사용한 제목 생성
    const aiRequest = {
      model: 'dep86pjolcjjnv8',
      messages: [
        {
          role: 'system',
          content: `다음 대화를 요약하여 핵심 주제를 나타내는 제목을 만들어주세요.
규칙:
1. 대화의 핵심 주제나 목적을 명확히 표현
2. 10자 이내의 간결한 한국어
3. 제목만 출력 (따옴표, 설명 없이)
4. 명사형으로 끝내기

예시:
- "날씨 정보 요청" (날씨 대화)
- "React 컴포넌트 학습" (프로그래밍 질문)
- "저녁 메뉴 추천" (음식 추천 대화)
- "여행 계획 상담" (여행 관련 대화)`
        },
        {
          role: 'user',
          content: text.slice(0, 500) // 토큰 제한을 위해 500자로 제한
        }
      ],
      max_tokens: 50,
      temperature: 0.3, // 더 일관된 결과를 위해 낮춤
    };

    console.log('Sending request to AI API with text:', text);
    console.log('AI Request:', JSON.stringify(aiRequest, null, 2));
    
    const response = await fetch('https://inference.friendli.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4',
      },
      body: JSON.stringify(aiRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('AI API error:', response.status, errorData);
      // API 에러시 텍스트 첫 부분을 제목으로 사용
      const fallbackTitle = text.slice(0, 30) || '새 대화';
      return NextResponse.json({ title: fallbackTitle });
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));
    
    const generatedTitle = data.choices?.[0]?.message?.content?.trim() || '';
    console.log('Generated title:', generatedTitle);

    // 생성된 제목 정제
    let title = generatedTitle;
    
    // 따옴표 제거
    title = title.replace(/["'`]/g, '');
    
    // 제목이 너무 길면 자르기
    if (title.length > 30) {
      title = title.slice(0, 27) + '...';
    }

    // 제목이 비어있으면 fallback
    if (!title) {
      console.log('Empty title from AI, using text fallback');
      // 텍스트의 첫 부분을 제목으로 사용
      title = text.slice(0, 30) || '새 대화';
    }

    console.log('Final title:', title);
    return NextResponse.json({ title });
  } catch (error) {
    console.error('Error generating title:', error);
    
    // 에러 발생시 간단한 fallback 제목 생성
    const { text = '' } = body || {};
    const fallbackTitle = text ? text.slice(0, 30) : '새 대화';
    console.log('Using fallback title:', fallbackTitle);
    return NextResponse.json({ title: fallbackTitle });
  }
}
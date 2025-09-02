'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TestTitlePage() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testCases = [
    {
      name: '날씨 대화',
      text: '사용자: 오늘 날씨 어때?\nAI: 오늘은 맑고 화창한 날씨입니다. 기온은 22도로 야외 활동하기 좋습니다.'
    },
    {
      name: '프로그래밍 질문',
      text: '사용자: React 컴포넌트 만드는 방법 알려줘\nAI: React 컴포넌트는 함수형과 클래스형이 있습니다...'
    },
    {
      name: '일상 대화',
      text: '사용자: 저녁 메뉴 추천해줘\nAI: 오늘 저녁으로는 김치찌개나 된장찌개 어떠신가요?'
    }
  ];

  const testTitle = async (text: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/demo/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'true',
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();
      setResult(`생성된 제목: "${data.title}"\n입력 텍스트: ${text.slice(0, 100)}...`);
    } catch (error) {
      setResult(`에러 발생: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">AI 제목 생성 테스트</h1>
      
      <div className="space-y-4">
        {testCases.map((testCase, index) => (
          <Card key={index} className="p-4">
            <h3 className="font-semibold mb-2">{testCase.name}</h3>
            <p className="text-sm text-gray-600 mb-3">{testCase.text}</p>
            <Button 
              onClick={() => testTitle(testCase.text)}
              disabled={loading}
            >
              테스트 실행
            </Button>
          </Card>
        ))}
      </div>

      {result && (
        <Card className="mt-6 p-4">
          <h2 className="font-semibold mb-2">결과:</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </Card>
      )}
    </div>
  );
}
'use client';

import { Response } from '@/components/elements/response';

export default function TestLinks() {
  const testContent = `
# 링크 테스트 페이지

## 테스트 1: 표준 마크다운 링크
[Google](https://www.google.com)
[네이버](https://www.naver.com)

## 테스트 2: 참조 스타일 링크 (현재 문제)
- [1] 안녕 - https://ko.wiktionary.org/wiki/안녕
- [2] 안녕 - https://namu.wiki/w/안녕

## 테스트 3: 일반 URL
https://www.google.com
https://www.naver.com

## 테스트 4: 인라인 코드와 링크
\`code\` and [link](https://example.com)
`;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">링크 렌더링 테스트</h1>
      
      <div className="border p-4 rounded bg-gray-50 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-2">원본 텍스트:</h2>
        <pre className="text-sm bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
          {testContent}
        </pre>
      </div>

      <div className="border p-4 rounded mt-4">
        <h2 className="text-lg font-semibold mb-2">Response 컴포넌트 렌더링:</h2>
        <Response>{testContent}</Response>
      </div>

      <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
        <h3 className="font-semibold">디버깅 정보:</h3>
        <p>브라우저 개발자 도구를 열고 Console 탭을 확인하세요.</p>
        <p>링크를 클릭하면 &quot;Link clicked:&quot; 메시지가 나타나야 합니다.</p>
      </div>
    </div>
  );
}
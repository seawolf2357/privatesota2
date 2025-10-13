// 빠른 메모리 시스템 테스트
const API_URL = 'http://localhost:3001/api/test-memory';

async function testMemorySystem() {
  console.log('=== 메모리 시스템 테스트 시작 ===\n');

  const testMessages = [
    "제 이름은 김철수입니다",
    "저는 서울에 살고 있어요",
    "저는 커피를 좋아해요",
    "오늘 정말 행복해요!",
    "내일 중요한 회의가 있습니다"
  ];

  for (const message of testMessages) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          data: { message, userId: 'test-user' }
        })
      });

      const data = await response.json();

      if (data.success && data.result) {
        const result = data.result;
        const memory = result.processedMemory;

        console.log(`메시지: "${message}"`);
        console.log(`  저장 여부: ${result.shouldSave ? '✓ 저장됨' : '✗ 스킵됨'}`);

        if (memory) {
          console.log(`  카테고리: ${memory.category}`);
          console.log(`  중요도: ${(memory.importance || 0).toFixed(4)}`);
          console.log(`  신뢰도: ${(memory.confidence || 0).toFixed(4)}`);

          if (memory.emotionalContext) {
            console.log(`  감정: ${memory.emotionalContext.primaryEmotion} (${memory.emotionalContext.emotionIntensity.toFixed(2)})`);
          }

          console.log(`  분석 과정:`);
          if (memory.reasoning && Array.isArray(memory.reasoning)) {
            memory.reasoning.forEach(r => console.log(`    • ${r}`));
          }
        }
        console.log('');
      } else {
        console.log(`❌ 처리 실패: ${data.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.log(`❌ 요청 실패: ${error.message}`);
    }
  }

  console.log('=== 테스트 완료 ===');
}

// Node.js 환경 확인 및 fetch polyfill
if (typeof fetch === 'undefined') {
  console.log('Node.js 환경에서 실행 중. node-fetch를 사용합니다.');
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
}

testMemorySystem();
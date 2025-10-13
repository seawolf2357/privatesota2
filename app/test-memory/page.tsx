'use client';

import { useState } from 'react';

export default function TestMemoryPage() {
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('single');

  const testCases = {
    개인정보: [
      "제 이름은 김철수입니다",
      "저는 서울에 살고 있어요",
      "제 생일은 1990년 3월 15일입니다",
      "제 이메일은 test@example.com이에요"
    ],
    선호도: [
      "저는 피자를 정말 좋아해요",
      "클래식 음악을 즐겨 들어요",
      "호러 영화는 별로 안 좋아합니다",
      "커피보다 차를 더 선호해요"
    ],
    관계: [
      "제 아내의 이름은 영희입니다",
      "두 명의 자녀가 있어요",
      "부모님은 부산에 계세요",
      "가장 친한 친구는 대학 동기예요"
    ],
    목표: [
      "올해 안에 영어 공부를 마스터하고 싶어요",
      "5kg 감량이 목표입니다",
      "새로운 프로그래밍 언어를 배우려고 해요",
      "내년에는 유럽 여행을 계획하고 있어요"
    ],
    감정: [
      "오늘 정말 행복한 하루였어요!",
      "시험 때문에 너무 걱정돼요",
      "승진 소식에 너무 기뻐요!!!",
      "요즘 좀 우울한 기분이에요"
    ],
    중복: [
      "제 이름은 김철수입니다",
      "저는 김철수라고 합니다",
      "김철수입니다",
      "My name is 김철수"
    ]
  };

  const processMessage = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process',
          data: { message }
        })
      });

      const data = await response.json();
      setResults([data, ...results]);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const processBatch = async (messages: string[]) => {
    setLoading(true);
    try {
      const response = await fetch('/api/test-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch',
          data: { messages }
        })
      });

      const data = await response.json();
      setResults([data, ...results]);
    } catch (error) {
      console.error('Error:', error);
    }
    setLoading(false);
  };

  const updateSensitivity = async (feedback: string) => {
    try {
      const response = await fetch('/api/test-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sensitivity',
          data: { feedback }
        })
      });

      const data = await response.json();
      alert(data.message || 'Sensitivity updated');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/test-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'status',
          data: {}
        })
      });

      const data = await response.json();
      setResults([data, ...results]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const processDeferredMessages = async () => {
    try {
      const response = await fetch('/api/test-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deferred',
          data: {}
        })
      });

      const data = await response.json();
      setResults([data, ...results]);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">메모리 시스템 테스트</h1>

        {/* 탭 메뉴 */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('single')}
            className={`px-4 py-2 rounded ${
              activeTab === 'single'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            단일 메시지
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded ${
              activeTab === 'batch'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            배치 테스트
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded ${
              activeTab === 'system'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200'
            }`}
          >
            시스템 제어
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 입력 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow">
            {activeTab === 'single' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">단일 메시지 처리</h2>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 border rounded-lg mb-4"
                  rows={4}
                  placeholder="메모리로 처리할 메시지를 입력하세요..."
                />
                <button
                  onClick={processMessage}
                  disabled={loading || !message}
                  className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
                >
                  {loading ? '처리중...' : '메시지 처리'}
                </button>

                <div className="mt-4">
                  <h3 className="font-semibold mb-2">빠른 테스트:</h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "제 이름은 홍길동입니다",
                      "저는 커피를 좋아해요",
                      "내일 회의가 있습니다",
                      "오늘 너무 행복해요!"
                    ].map((msg, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMessage(msg)}
                        className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
                      >
                        {msg}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'batch' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">배치 테스트</h2>
                {Object.entries(testCases).map(([category, messages]) => (
                  <div key={category} className="mb-4">
                    <h3 className="font-semibold mb-2">{category}</h3>
                    <button
                      onClick={() => processBatch(messages)}
                      disabled={loading}
                      className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
                    >
                      {loading ? '처리중...' : `${category} 테스트 (${messages.length}개)`}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">시스템 제어</h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">민감도 조정</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateSensitivity('too_sensitive')}
                        className="flex-1 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                      >
                        너무 민감함
                      </button>
                      <button
                        onClick={() => updateSensitivity('not_sensitive_enough')}
                        className="flex-1 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                      >
                        민감도 부족
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={checkStatus}
                    className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                  >
                    시스템 상태 확인
                  </button>

                  <button
                    onClick={processDeferredMessages}
                    className="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600"
                  >
                    지연된 메시지 처리
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 결과 섹션 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">처리 결과</h2>
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">아직 결과가 없습니다.</p>
              ) : (
                results.map((result, idx) => (
                  <div key={idx} className="border p-4 rounded">
                    {result.result && (
                      <div>
                        <div className="mb-2">
                          <span className="font-semibold">저장 여부:</span>{' '}
                          <span className={result.result.shouldSave ? 'text-green-600' : 'text-red-600'}>
                            {result.result.shouldSave ? '저장됨' : '저장 안됨'}
                          </span>
                        </div>
                        {result.result.processedMemory && (
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-semibold">카테고리:</span>{' '}
                              {result.result.processedMemory.category}
                            </div>
                            <div>
                              <span className="font-semibold">중요도:</span>{' '}
                              {result.result.processedMemory.importance?.toFixed(3)}
                            </div>
                            <div>
                              <span className="font-semibold">신뢰도:</span>{' '}
                              {result.result.processedMemory.confidence?.toFixed(3)}
                            </div>
                            <div>
                              <span className="font-semibold">상태:</span>{' '}
                              {result.result.processedMemory.duplicateStatus}
                            </div>
                            {result.result.processedMemory.emotionalContext && (
                              <div>
                                <span className="font-semibold">감정:</span>{' '}
                                {result.result.processedMemory.emotionalContext.primaryEmotion}
                                ({result.result.processedMemory.emotionalContext.emotionIntensity?.toFixed(2)})
                              </div>
                            )}
                            <details className="mt-2">
                              <summary className="cursor-pointer font-semibold">분석 과정</summary>
                              <div className="mt-1 pl-4 text-xs">
                                {result.result.processedMemory.reasoning?.map((r: string, i: number) => (
                                  <div key={i}>• {r}</div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                    {result.results && (
                      <div>
                        <h3 className="font-semibold mb-2">배치 결과:</h3>
                        {result.results.map((r: any, i: number) => (
                          <div key={i} className="mb-2 pl-4 text-sm">
                            <div className="font-medium">{r.message}</div>
                            <div className={r.result.shouldSave ? 'text-green-600' : 'text-red-600'}>
                              → {r.result.shouldSave ? '저장' : '스킵'}
                              ({r.result.processedMemory?.category})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {result.status && (
                      <div>
                        <h3 className="font-semibold mb-2">시스템 상태:</h3>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(result.status, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {results.length > 0 && (
              <button
                onClick={() => setResults([])}
                className="mt-4 text-sm text-red-600 hover:text-red-800"
              >
                결과 지우기
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
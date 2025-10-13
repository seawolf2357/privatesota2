import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedMemoryManagerV2 } from '@/lib/ai/enhanced-memory-manager-v2';
import { Message, UserMemory } from '@/lib/ai/types';

// CORS 헤더 설정
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const memoryManager = getEnhancedMemoryManagerV2();

    switch (action) {
      case 'process': {
        // 단일 메시지 처리 테스트
        const { message, userId = 'test-user' } = data;

        const testMessage: Message = {
          role: 'user',
          content: message,
          timestamp: new Date(),
          sessionId: 'test-session'
        };

        const result = await memoryManager.processMemoryComprehensively(
          testMessage,
          userId,
          [], // 기존 메모리 (빈 배열로 시작)
          [] // 대화 히스토리
        );

        // 디버깅 정보 추가
        console.log('Processing result:', {
          message: message,
          shouldSave: result.shouldSave,
          importance: result.processedMemory?.importance,
          category: result.processedMemory?.category,
          reasoning: result.processedMemory?.reasoning
        });

        return NextResponse.json({
          success: true,
          result,
          debug: {
            message: message,
            importance: result.processedMemory?.importance,
            shouldSave: result.shouldSave
          }
        }, { headers: corsHeaders });
      }

      case 'batch': {
        // 배치 처리 테스트
        const { messages, userId = 'test-user' } = data;
        const results = [];

        for (const msg of messages) {
          const testMessage: Message = {
            role: 'user',
            content: msg,
            timestamp: new Date(),
            sessionId: 'test-session'
          };

          const result = await memoryManager.processMemoryComprehensively(
            testMessage,
            userId,
            [],
            []
          );

          results.push({
            message: msg,
            result
          });
        }

        return NextResponse.json({
          success: true,
          results
        }, { headers: corsHeaders });
      }

      case 'sensitivity': {
        // 민감도 조정 테스트
        const { userId = 'test-user', feedback } = data;

        memoryManager.updateUserSensitivity(userId, feedback);

        return NextResponse.json({
          success: true,
          message: `Sensitivity updated: ${feedback}`
        }, { headers: corsHeaders });
      }

      case 'status': {
        // 시스템 상태 확인
        const { userId = 'test-user' } = data;

        const status = memoryManager.getSystemStatus(userId);

        return NextResponse.json({
          success: true,
          status
        }, { headers: corsHeaders });
      }

      case 'deferred': {
        // 지연된 메시지 처리
        const { userId = 'test-user' } = data;

        const deferred = await memoryManager.processDeferredMessages(userId);

        return NextResponse.json({
          success: true,
          deferredMessages: deferred.map(m => m.content)
        }, { headers: corsHeaders });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Memory test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500, headers: corsHeaders });
  }
}

export async function GET(request: NextRequest) {
  // 테스트 케이스 목록 반환
  const testCases = [
    {
      category: '개인정보',
      messages: [
        "제 이름은 김철수입니다",
        "저는 서울에 살고 있어요",
        "제 생일은 1990년 3월 15일입니다",
        "제 이메일은 test@example.com이에요"
      ]
    },
    {
      category: '선호도',
      messages: [
        "저는 피자를 정말 좋아해요",
        "클래식 음악을 즐겨 들어요",
        "호러 영화는 별로 안 좋아합니다",
        "커피보다 차를 더 선호해요"
      ]
    },
    {
      category: '관계',
      messages: [
        "제 아내의 이름은 영희입니다",
        "두 명의 자녀가 있어요",
        "부모님은 부산에 계세요",
        "가장 친한 친구는 대학 동기예요"
      ]
    },
    {
      category: '목표',
      messages: [
        "올해 안에 영어 공부를 마스터하고 싶어요",
        "5kg 감량이 목표입니다",
        "새로운 프로그래밍 언어를 배우려고 해요",
        "내년에는 유럽 여행을 계획하고 있어요"
      ]
    },
    {
      category: '감정',
      messages: [
        "오늘 정말 행복한 하루였어요!",
        "시험 때문에 너무 걱정돼요",
        "승진 소식에 너무 기뻐요!!!",
        "요즘 좀 우울한 기분이에요"
      ]
    },
    {
      category: '중복',
      messages: [
        "제 이름은 김철수입니다",
        "저는 김철수라고 합니다",
        "김철수입니다",
        "My name is 김철수"
      ]
    }
  ];

  return NextResponse.json({
    success: true,
    testCases,
    instructions: {
      endpoints: {
        process: 'POST /api/test-memory with { action: "process", data: { message: "..." } }',
        batch: 'POST /api/test-memory with { action: "batch", data: { messages: [...] } }',
        sensitivity: 'POST /api/test-memory with { action: "sensitivity", data: { feedback: "too_sensitive" | "not_sensitive_enough" } }',
        status: 'POST /api/test-memory with { action: "status" }',
        deferred: 'POST /api/test-memory with { action: "deferred" }'
      }
    }
  }, { headers: corsHeaders });
}
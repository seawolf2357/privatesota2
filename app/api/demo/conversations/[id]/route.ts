import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - 특정 대화의 메시지 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const { id: conversationId } = params;
    
    console.log('[GET Conversation] Fetching messages for conversation:', conversationId);

    // 대화의 메시지들 가져오기
    const messages = await (db as any)
      .select()
      .from(message)
      .where(eq(message.chatId, conversationId))
      .orderBy(message.createdAt);
    
    console.log('[GET Conversation] Found messages:', messages.length);
    if (messages.length > 0) {
      console.log('[GET Conversation] First message structure:', JSON.stringify(messages[0], null, 2));
    }

    // parts 형식을 content 형식으로 변환
    const formattedMessages = messages.map((msg: any) => {
      // parts가 배열인지 확인하고 적절히 처리
      let content = '';
      
      // 디버깅을 위한 로깅
      if (messages.length > 0 && msg === messages[0]) {
        console.log('[GET Conversation] First message parts:', msg.parts);
        console.log('[GET Conversation] Parts type:', typeof msg.parts);
      }
      
      if (msg.parts) {
        if (Array.isArray(msg.parts)) {
          // PostgreSQL: parts is an array
          content = msg.parts[0]?.text || '';
        } else if (typeof msg.parts === 'object' && !Array.isArray(msg.parts)) {
          // parts가 객체인 경우
          if (msg.parts.text) {
            content = msg.parts.text;
          } else if (msg.parts[0]) {
            content = msg.parts[0].text || '';
          }
        } else if (typeof msg.parts === 'string') {
          // SQLite might store as string
          try {
            const parsed = JSON.parse(msg.parts);
            if (Array.isArray(parsed)) {
              content = parsed[0]?.text || '';
            } else if (parsed.text) {
              content = parsed.text;
            }
          } catch {
            content = msg.parts;
          }
        }
      }
      
      // content가 여전히 비어있으면 deprecated content 필드 확인
      if (!content && msg.content) {
        if (typeof msg.content === 'string') {
          content = msg.content;
        } else if (typeof msg.content === 'object' && msg.content.text) {
          content = msg.content.text;
        }
      }
      
      return {
        id: msg.id,
        role: msg.role,
        content: content,
        createdAt: msg.createdAt,
      };
    });

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// PUT - 대화 업데이트 (메시지 추가)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const { id: conversationId } = params;
    const body = await request.json();
    const { messages: chatMessages } = body;

    // 기존 메시지 삭제
    await (db as any)
      .delete(message)
      .where(eq(message.chatId, conversationId));

    // 새로운 메시지들 저장
    if (chatMessages && chatMessages.length > 0) {
      const messagesToInsert = chatMessages.map((msg: any) => ({
        id: crypto.randomUUID(),
        chatId: conversationId,
        role: msg.role,
        parts: [{ type: 'text', text: msg.content }],
        attachments: [],
        createdAt: new Date(),
      }));

      await (db as any).insert(message).values(messagesToInsert);
    }

    // AI를 사용한 제목 생성 및 업데이트
    const userMessages = chatMessages.filter((m: any) => m.role === 'user');
    if (userMessages.length > 0) {
      try {
        // AI로 제목 생성 - 사용자와 AI 응답 모두 포함
        const conversationText = chatMessages
          .slice(0, 6)
          .map((m: any) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content.slice(0, 100)}`)
          .join('\n');

        const titleResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3006'}/api/demo/generate-title`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-mode': 'true',
          },
          body: JSON.stringify({
            text: conversationText,
          }),
        });

        let title = '새 대화';
        if (titleResponse.ok) {
          const data = await titleResponse.json();
          title = data.title || userMessages[0].content.slice(0, 50);
        } else {
          // AI 실패시 fallback
          title = userMessages[0].content.slice(0, 50);
        }

        await (db as any)
          .update(chat)
          .set({ title })
          .where(eq(chat.id, conversationId));
      } catch (error) {
        console.error('Error generating title:', error);
        // 에러시 간단한 제목 사용
        const simpleTitle = userMessages[0].content.slice(0, 50);
        await (db as any)
          .update(chat)
          .set({ title: simpleTitle })
          .where(eq(chat.id, conversationId));
      }
    }

    return NextResponse.json({ 
      message: 'Conversation updated successfully' 
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
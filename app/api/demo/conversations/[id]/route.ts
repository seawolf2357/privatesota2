import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - 특정 대화의 메시지 가져오기
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const { id: conversationId } = await params;

    // 대화의 메시지들 가져오기
    const messages = await db
      .select()
      .from(message)
      .where(eq(message.chatId, conversationId))
      .orderBy(message.createdAt);

    // parts 형식을 content 형식으로 변환
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.parts[0]?.text || '',
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error) {
    console.error('Error fetching conversation messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

// PUT - 대화 업데이트 (메시지 추가)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { messages: chatMessages } = body;

    // 기존 메시지 삭제
    await db
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

      await db.insert(message).values(messagesToInsert);
    }

    // 제목 업데이트 (첫 사용자 메시지 기반)
    const userMessages = chatMessages.filter((m: any) => m.role === 'user');
    if (userMessages.length > 0) {
      const title = userMessages.map((m: any) => m.content).join(' ').slice(0, 50);
      await db
        .update(chat)
        .set({ title })
        .where(eq(chat.id, conversationId));
    }

    return NextResponse.json({ 
      message: 'Conversation updated successfully' 
    });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Failed to update conversation' }, { status: 500 });
  }
}
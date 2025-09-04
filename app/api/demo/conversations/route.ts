import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { chat, message } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';

// GET - 대화 목록 조회
export async function GET(request: NextRequest) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const conversations = await (db as any)
      .select()
      .from(chat)
      .where(eq(chat.userId, DEMO_USER_ID))
      .orderBy(desc(chat.createdAt))
      .limit(20);

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST - 새 대화 생성
export async function POST(request: NextRequest) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const body = await request.json();
    const { title, sessionId, messages: chatMessages } = body;

    const conversationId = crypto.randomUUID();
    const now = new Date();

    // 대화 생성
    await (db as any).insert(chat).values({
      id: conversationId,
      userId: DEMO_USER_ID,
      title: title || '새 대화',
      createdAt: now,
    });

    // 메시지 저장
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

    return NextResponse.json({ 
      conversationId,
      message: 'Conversation saved successfully' 
    });
  } catch (error) {
    console.error('Error saving conversation:', error);
    return NextResponse.json({ error: 'Failed to save conversation' }, { status: 500 });
  }
}

// DELETE - 대화 삭제
export async function DELETE(request: NextRequest) {
  try {
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    if (!isDemoMode) {
      return NextResponse.json({ error: 'Demo mode only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('id');

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
    }

    // 관련된 모든 데이터 삭제
    // 1. 먼저 메시지 삭제
    const deletedMessages = await (db as any)
      .delete(message)
      .where(eq(message.chatId, conversationId));
    
    console.log(`Deleted ${deletedMessages} messages for conversation ${conversationId}`);
    
    // 2. 그 다음 대화 삭제
    const deletedChat = await (db as any)
      .delete(chat)
      .where(eq(chat.id, conversationId));
    
    console.log(`Deleted chat ${conversationId}`);

    return NextResponse.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 });
  }
}
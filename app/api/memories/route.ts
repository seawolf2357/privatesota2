import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { MemoryManager } from '@/lib/ai/memory-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    // Get userId from query params or session
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session?.user?.id || 'demo-user';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const memoryManager = new MemoryManager(userId);
    const memories = await memoryManager.getAllMemories();

    return NextResponse.json(memories);
  } catch (error) {
    console.error('Error fetching memories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { category, content, confidence = 1.0, sessionId } = body;
    
    const userId = session?.user?.id || 'demo-user';
    const memoryManager = new MemoryManager(userId);
    
    const memoryId = await memoryManager.saveMemory(
      category,
      content,
      confidence,
      sessionId
    );

    return NextResponse.json({ 
      id: memoryId,
      status: 'success' 
    });
  } catch (error) {
    console.error('Error saving memory:', error);
    return NextResponse.json(
      { error: 'Failed to save memory' },
      { status: 500 }
    );
  }
}
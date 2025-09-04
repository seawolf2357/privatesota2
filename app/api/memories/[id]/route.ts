import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { MemoryManager } from '@/lib/ai/memory-manager';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session?.user?.id || DEMO_USER_ID;
    const memoryManager = new MemoryManager(userId);
    
    const success = await memoryManager.deleteMemory(id);
    
    if (success) {
      return NextResponse.json({ status: 'success' });
    } else {
      return NextResponse.json(
        { error: 'Memory not found or unauthorized' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error deleting memory:', error);
    return NextResponse.json(
      { error: 'Failed to delete memory' },
      { status: 500 }
    );
  }
}
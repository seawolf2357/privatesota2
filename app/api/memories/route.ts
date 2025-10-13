import { NextRequest, NextResponse } from 'next/server';
import { MemoryManager } from '@/lib/ai/memory-manager';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';

// GET /api/memories - Get all memories for user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || DEMO_USER_ID;
    const category = searchParams.get('category');

    const memoryManager = new MemoryManager(userId);

    let memories;
    if (category && category !== 'all') {
      memories = await memoryManager.getMemoriesByCategory(category as any);
    } else {
      memories = await memoryManager.getAllMemories();
    }

    // Group by category for better organization
    const groupedMemories: Record<string, any[]> = {};
    memories.forEach(memory => {
      if (!groupedMemories[memory.category]) {
        groupedMemories[memory.category] = [];
      }
      groupedMemories[memory.category].push({
        id: memory.id,
        content: memory.content,
        confidence: memory.confidence,
        metadata: memory.metadata,
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt
      });
    });

    return NextResponse.json({
      success: true,
      userId,
      totalCount: memories.length,
      memories: groupedMemories
    });
  } catch (error) {
    console.error('[Memory API] Error fetching memories:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch memories'
      },
      { status: 500 }
    );
  }
}

// POST /api/memories - Create new memory
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = DEMO_USER_ID, category, content, confidence = 1.0 } = body;

    if (!category || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Category and content are required'
        },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager(userId);
    const memoryId = await memoryManager.saveMemory(
      category,
      content,
      confidence,
      'manual-entry'
    );

    return NextResponse.json({
      success: true,
      memoryId,
      message: 'Memory saved successfully'
    });
  } catch (error) {
    console.error('[Memory API] Error saving memory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save memory'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/memories - Delete memory
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || DEMO_USER_ID;
    const memoryId = searchParams.get('id');

    if (!memoryId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Memory ID is required'
        },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager(userId);
    const deleted = await memoryManager.deleteMemory(memoryId);

    return NextResponse.json({
      success: deleted,
      message: deleted ? 'Memory deleted successfully' : 'Memory not found'
    });
  } catch (error) {
    console.error('[Memory API] Error deleting memory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete memory'
      },
      { status: 500 }
    );
  }
}

// PUT /api/memories - Update memory
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId = DEMO_USER_ID, memoryId, category, content, confidence } = body;

    if (!memoryId || !category || !content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Memory ID, category, and content are required'
        },
        { status: 400 }
      );
    }

    const memoryManager = new MemoryManager(userId);

    // Delete old memory and create new one (simple update strategy)
    await memoryManager.deleteMemory(memoryId);
    const newMemoryId = await memoryManager.saveMemory(
      category,
      content,
      confidence || 1.0,
      'manual-update'
    );

    return NextResponse.json({
      success: true,
      memoryId: newMemoryId,
      message: 'Memory updated successfully'
    });
  } catch (error) {
    console.error('[Memory API] Error updating memory:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update memory'
      },
      { status: 500 }
    );
  }
}
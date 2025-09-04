'use client';

import { useState, useEffect } from 'react';
import { Trash2, Brain, Calendar, User, Heart, StickyNote, ListTodo, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface Memory {
  id: string;
  category: string;
  content: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}

interface MemoryPanelProps {
  userId?: string;
  className?: string;
  refreshKey?: number;
}

const categoryIcons = {
  personal_info: User,
  preferences: Heart,
  important_dates: Calendar,
  tasks: ListTodo,
  notes: StickyNote,
  general: Brain,
};

const categoryColors = {
  personal_info: 'bg-blue-500/10 text-blue-500',
  preferences: 'bg-pink-500/10 text-pink-500',
  important_dates: 'bg-green-500/10 text-green-500',
  tasks: 'bg-yellow-500/10 text-yellow-500',
  notes: 'bg-purple-500/10 text-purple-500',
  general: 'bg-gray-500/10 text-gray-500',
};

const categoryNames = {
  personal_info: '개인 정보',
  preferences: '선호도',
  important_dates: '중요한 날짜',
  tasks: '할 일',
  notes: '메모',
  general: '일반',
};

export function MemoryPanel({ userId, className, refreshKey }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deletePopoverOpen, setDeletePopoverOpen] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchMemories();
    }
  }, [userId, refreshKey]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const isDemoMode = userId === '00000000-0000-0000-0000-000000000001' || userId?.startsWith('demo-');
      const response = await fetch(`/api/memories?userId=${userId}`, {
        headers: {
          'x-demo-mode': isDemoMode ? 'true' : 'false',
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('[MemoryPanel] Fetched memories:', data);
      console.log('[MemoryPanel] First memory date check:', {
        raw: data[0]?.updatedAt,
        parsed: data[0]?.updatedAt ? new Date(data[0].updatedAt) : null,
        isValid: data[0]?.updatedAt ? !isNaN(Date.parse(data[0].updatedAt)) : false
      });
        // 원본 데이터 그대로 사용 (날짜 조작 제거)
        setMemories(data);
      }
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    try {
      const isDemoMode = userId === '00000000-0000-0000-0000-000000000001' || userId?.startsWith('demo-');
      const response = await fetch(`/api/memories/${memoryId}`, {
        method: 'DELETE',
        headers: {
          'x-demo-mode': isDemoMode ? 'true' : 'false',
        },
      });

      if (response.ok) {
        setMemories(prev => prev.filter(m => m.id !== memoryId));
        setDeletePopoverOpen(null);
      }
    } catch (error) {
      console.error('Failed to delete memory:', error);
    }
  };

  const filteredMemories = selectedCategory
    ? memories.filter(m => m.category === selectedCategory)
    : memories;

  const memoriesByCategory = memories.reduce((acc, memory) => {
    if (!acc[memory.category]) {
      acc[memory.category] = [];
    }
    acc[memory.category].push(memory);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div className={cn('h-full', className)}>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="h-4 w-4" />
          기억된 정보
        </h3>
        <div className="text-xs text-muted-foreground">
          대화에서 추출된 중요한 정보들
        </div>
      </div>
      <div className="mt-4">
        {/* Category filters */}
        <div className="pb-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              전체 ({memories.length})
            </Button>
            {Object.entries(memoriesByCategory).map(([category, items]) => {
              const Icon = categoryIcons[category as keyof typeof categoryIcons] || Brain;
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="gap-1"
                >
                  <Icon className="h-3 w-3" />
                  {categoryNames[category as keyof typeof categoryNames] || category}
                  ({items.length})
                </Button>
              );
            })}
          </div>
        </div>

        <ScrollArea className="h-[400px] px-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              메모리 로딩 중...
            </div>
          ) : filteredMemories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {selectedCategory 
                ? `${categoryNames[selectedCategory as keyof typeof categoryNames]} 카테고리에 저장된 기억이 없습니다.`
                : '아직 저장된 기억이 없습니다.'}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {filteredMemories.map((memory) => {
                const Icon = categoryIcons[memory.category as keyof typeof categoryIcons] || Brain;
                const colorClass = categoryColors[memory.category as keyof typeof categoryColors] || categoryColors.general;
                
                return (
                  <div
                    key={memory.id}
                    className="group relative rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('p-2 rounded-lg', colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {categoryNames[memory.category as keyof typeof categoryNames] || memory.category}
                          </Badge>
                          {memory.confidence < 0.7 && (
                            <Badge variant="secondary" className="text-xs">
                              신뢰도 낮음
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground break-words">
                          {memory.content}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {memory.updatedAt && !isNaN(Date.parse(memory.updatedAt))
                            ? new Date(memory.updatedAt).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })
                            : '날짜 정보 없음'
                          }
                        </p>
                      </div>
                      <Popover 
                        open={deletePopoverOpen === memory.id}
                        onOpenChange={(open) => setDeletePopoverOpen(open ? memory.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-72 p-4" 
                          align="end"
                          sideOffset={5}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                              <div className="space-y-1">
                                <p className="text-sm font-semibold">
                                  이 기억을 삭제하시겠습니까?
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  삭제된 기억은 복구할 수 없습니다.
                                </p>
                              </div>
                            </div>
                            <div className="bg-muted/50 rounded-md p-2">
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {memory.content}
                              </p>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeletePopoverOpen(null)}
                              >
                                취소
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteMemory(memory.id)}
                              >
                                삭제
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Auto-save indicator */}
        <div className="px-4 py-2 border-t">
          <p className="text-xs text-muted-foreground text-center">
            메모리는 대화 중 자동으로 저장됩니다
          </p>
        </div>
      </div>
    </div>
  );
}
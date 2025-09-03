'use client';

import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationHistoryProps {
  refreshKey?: number;
  onSelectConversation?: (conversation: Conversation) => void;
  onLoadMessages?: (messages: any[]) => void;
}

export function ConversationHistory({ refreshKey, onSelectConversation, onLoadMessages }: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, [refreshKey]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/demo/conversations', {
        headers: {
          'x-demo-mode': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[ConversationHistory] Fetched conversations:', data.conversations);
        
        // 원본 데이터 그대로 사용 (날짜 조작 제거)
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/demo/conversations/${conversationId}`, {
        headers: {
          'x-demo-mode': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        onLoadMessages?.(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading conversation messages:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/demo/conversations?id=${conversationId}`, {
        method: 'DELETE',
        headers: {
          'x-demo-mode': 'true',
        },
      });

      if (response.ok) {
        fetchConversations();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        로딩 중...
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        대화 기록이 없습니다
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-2">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="group flex items-center justify-between p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
            onClick={() => {
              onSelectConversation?.(conversation);
              loadConversationMessages(conversation.id);
            }}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {conversation.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {conversation.createdAt && !isNaN(Date.parse(conversation.createdAt))
                    ? formatDistanceToNow(new Date(conversation.createdAt), {
                        addSuffix: true,
                        locale: ko,
                      })
                    : '날짜 정보 없음'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(conversation.id);
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
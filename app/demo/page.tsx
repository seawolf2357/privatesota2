'use client';

import { useState, useEffect } from 'react';
import { ChatSettings } from '@/components/chat-settings';
import { FileUpload } from '@/components/file-upload';
import { YuriBadge } from '@/components/yuri-badge';
import { ModelSelector } from '@/components/model-selector';
import { MemoryPanel } from '@/components/memory-panel';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Brain, Clock, Settings, Upload, MessageSquare, RotateCw } from 'lucide-react';

interface ConversationHistory {
  id: string;
  created_at: string;
  summary: string;
}

export default function DemoPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; processedContent: string }>>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [selfLearningEnabled, setSelfLearningEnabled] = useState(true);
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Initialize session
  useEffect(() => {
    const initSession = () => {
      const newSessionId = `demo-session-${Date.now()}`;
      setSessionId(newSessionId);
      console.log('Session initialized:', newSessionId);
    };
    initSession();

    // Load user name from localStorage
    const savedUserName = localStorage.getItem('userName');
    if (savedUserName) {
      setUserName(savedUserName);
    }

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time in KST
  const formatKSTTime = (date: Date) => {
    return date.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Include file context if files are uploaded
      let messageWithContext = userMessage;
      if (uploadedFiles.length > 0) {
        const fileContext = uploadedFiles.map(f => 
          `[Uploaded File: ${f.filename}]\n${f.processedContent}`
        ).join('\n\n');
        messageWithContext = `${fileContext}\n\n사용자 질문: ${userMessage}`;
      }

      // Call the enhanced demo chat API with web search and memory
      const response = await fetch('/api/demo-chat-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            content: messageWithContext,
          },
          webSearchEnabled,
          userId: 'demo-user',
          sessionId,
          includeMemories: selfLearningEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = '';
      const decoder = new TextDecoder();
      
      // Add assistant message placeholder
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices?.[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                assistantMessage += content;
                // Update the last message in real-time
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1].content = assistantMessage;
                  return newMessages;
                });
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Save message and trigger auto-save if needed
      if (selfLearningEnabled && messages.length % 10 === 0) {
        await autoSaveMemories();
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const autoSaveMemories = async () => {
    try {
      // This would call the memory extraction API
      console.log('Auto-saving memories...');
      // Show auto-save indicator
      const indicator = document.createElement('div');
      indicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
      indicator.textContent = '메모리 자동 저장됨';
      document.body.appendChild(indicator);
      setTimeout(() => indicator.remove(), 2000);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const loadConversationHistory = async () => {
    try {
      // This would load actual conversation history
      const mockHistory: ConversationHistory[] = [
        { id: '1', created_at: new Date().toISOString(), summary: '이전 대화 1' },
        { id: '2', created_at: new Date().toISOString(), summary: '이전 대화 2' },
      ];
      setConversationHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    localStorage.setItem('userName', name);
  };

  const handleNewSession = () => {
    setMessages([]);
    setUploadedFiles([]);
    const newSessionId = `demo-session-${Date.now()}`;
    setSessionId(newSessionId);
    console.log('New session started:', newSessionId);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Enhanced Sidebar like AGI Space */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Header with Time */}
        <div className="p-4 border-b">
          <div className="text-xs text-muted-foreground">
            현재 시간 (KST): {currentTime ? formatKSTTime(currentTime) : 'Loading...'}
          </div>
        </div>

        {/* Tabbed Sidebar Content */}
        <Tabs defaultValue="settings" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 px-4">
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs">
              <Brain className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs">
              <Upload className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Settings Tab */}
            <TabsContent value="settings" className="p-4 space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  설정
                </h3>
                
                {/* User Name */}
                <div>
                  <label className="text-xs text-muted-foreground">사용자 이름</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={handleUserNameChange}
                    placeholder="이름 입력..."
                    className="w-full mt-1 px-2 py-1 text-sm border rounded"
                  />
                </div>

                {/* Web Search Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm">웹 검색</label>
                  <button
                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      webSearchEnabled ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        webSearchEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Self Learning Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm">자가 학습</label>
                  <button
                    onClick={() => setSelfLearningEnabled(!selfLearningEnabled)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      selfLearningEnabled ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                        selfLearningEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Model Selector */}
                <div>
                  <label className="text-xs text-muted-foreground">AI 모델</label>
                  <ModelSelector 
                    selectedModelId={selectedModelId}
                    onModelChange={setSelectedModelId}
                  />
                </div>

                <Button 
                  onClick={handleNewSession}
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <RotateCw className="h-3 w-3 mr-2" />
                  새 세션 시작
                </Button>
              </div>
            </TabsContent>

            {/* Memory Tab */}
            <TabsContent value="memory" className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  기억된 정보
                </h3>
                <MemoryPanel userId="demo-user" className="border-0 p-0" />
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  대화 기록
                </h3>
                <div className="space-y-2">
                  {conversationHistory.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4">
                      대화 기록이 없습니다
                    </div>
                  ) : (
                    conversationHistory.map((conv) => (
                      <div
                        key={conv.id}
                        className="p-2 rounded border hover:bg-accent cursor-pointer text-xs"
                      >
                        <div className="text-muted-foreground">
                          {new Date(conv.created_at).toLocaleString('ko-KR')}
                        </div>
                        <div className="mt-1 truncate">{conv.summary}</div>
                      </div>
                    ))
                  )}
                </div>
                <Button 
                  onClick={loadConversationHistory}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  기록 불러오기
                </Button>
              </div>
            </TabsContent>

            {/* Files Tab */}
            <TabsContent value="files" className="p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  파일 업로드
                </h3>
                <FileUpload 
                  sessionId={sessionId || 'demo'} 
                  onFilesChange={(files) => {
                    setUploadedFiles(files.map(f => ({
                      filename: f.filename,
                      processedContent: f.processedContent || ''
                    })));
                  }}
                />
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Bottom Action Button */}
        <div className="p-4 border-t">
          <Button 
            variant="default" 
            size="sm"
            className="w-full"
            onClick={autoSaveMemories}
          >
            <Brain className="h-3 w-3 mr-2" />
            기억 저장
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                jetXA AI Assistant
              </h1>
              <p className="text-sm text-muted-foreground">
                고급 멀티모달 AI 어시스턴트 • 세션: {sessionId.slice(-8)}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {webSearchEnabled && (
                <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded">
                  웹 검색 ON
                </span>
              )}
              {selfLearningEnabled && (
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded">
                  자가 학습 ON
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground mt-8">
                <p className="text-4xl mb-4">🚀</p>
                <p className="font-semibold text-lg">jetXA에 오신 것을 환영합니다</p>
                <p className="text-sm mt-2">고급 멀티모달 AI 어시스턴트</p>
                <div className="mt-4 text-sm space-y-1">
                  <p>✨ 이미지 분석 및 문서 처리</p>
                  <p>🔍 실시간 웹 검색</p>
                  <p>🧠 대화 내용 기억 및 학습</p>
                  <p>🌐 다국어 지원</p>
                </div>
                <p className="text-sm mt-4">무엇을 도와드릴까요?</p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-2 opacity-70">
                      {msg.role === 'user' ? userName || '사용자' : 'jetXA'}
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-lg p-4">
                  <div className="text-xs font-semibold mb-2 opacity-70">jetXA</div>
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce delay-100">●</span>
                    <span className="animate-bounce delay-200">●</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4 bg-card">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatSettings } from '@/components/chat-settings';
import { FileUpload } from '@/components/file-upload';
import { YuriBadge } from '@/components/yuri-badge';
import { ModelSelector } from '@/components/model-selector';
import { MemoryPanel } from '@/components/memory-panel';
import { ConversationHistory } from '@/components/conversation-history';
import { ThemeToggle } from '@/components/theme-toggle';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Brain, Clock, Settings, Upload, MessageSquare, RotateCw, LogIn, UserCircle } from 'lucide-react';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';
import { useSession, signIn, signOut } from 'next-auth/react';


export default function MainPage() {
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';
  const isLoggedIn = !!session?.user && session.user.type === 'regular';
  const isGuest = session?.user?.type === 'guest';
  const userId = session?.user?.id;
  
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; processedContent: string }>>([]);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [selfLearningEnabled, setSelfLearningEnabled] = useState(true);
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [loadedConversationId, setLoadedConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initialize session based on auth status
  useEffect(() => {
    const initSession = () => {
      const sessionPrefix = isLoggedIn ? 'user' : isGuest ? 'guest' : 'demo';
      const newSessionId = `${sessionPrefix}-session-${Date.now()}`;
      setSessionId(newSessionId);
      console.log('Session initialized:', newSessionId, 'User type:', session?.user?.type || 'anonymous');
    };
    if (status !== 'loading') {
      initSession();
    }

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

  // Auto-save conversation when messages change
  useEffect(() => {
    if (messages.length >= 2 && messages.length % 2 === 0) {
      // Save after each complete exchange (user + assistant)
      const timer = setTimeout(() => {
        if (loadedConversationId) {
          // Update existing conversation
          updateConversation(loadedConversationId);
        } else {
          // Save new conversation
          saveConversation();
        }
      }, 1000); // Delay to ensure messages are fully updated
      
      return () => clearTimeout(timer);
    }
  }, [messages, loadedConversationId]);

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
    if (!input.trim() || isChatLoading) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    // Scroll to bottom when user sends a message
    setTimeout(() => {
      scrollToBottom();
    }, 100);

    try {
      // Include file context if files are uploaded
      let messageWithContext = userMessage;
      if (uploadedFiles.length > 0) {
        console.log('Uploaded files:', uploadedFiles);
        const fileContext = uploadedFiles.map(f => {
          const content = f.processedContent || '[파일 내용을 읽을 수 없습니다]';
          console.log(`File: ${f.filename}, Content length: ${content.length}`);
          return `[Uploaded File: ${f.filename}]\n${content}`;
        }).join('\n\n');
        messageWithContext = `${fileContext}\n\n사용자 질문: ${userMessage}`;
        console.log('Message with context:', messageWithContext.substring(0, 500));
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
          userId: userId,
          sessionId,
          includeMemories: selfLearningEnabled && isLoggedIn,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMessage = '';
      const decoder = new TextDecoder();
      
      // Add assistant message placeholder and scroll to bottom
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      // Scroll to bottom when assistant starts responding
      setTimeout(() => {
        scrollToBottom();
      }, 100);

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
                  // Check if there are messages before updating
                  if (newMessages.length > 0) {
                    newMessages[newMessages.length - 1].content = assistantMessage;
                  }
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
      setIsChatLoading(false);
    }
  };

  const autoSaveMemories = async () => {
    try {
      setIsSavingMemory(true);
      console.log('Auto-saving memories...');
      
      // Extract memories from current conversation
      if (messages.length < 2) {
        const indicator = document.createElement('div');
        indicator.className = 'fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg';
        indicator.textContent = '저장할 대화가 없습니다';
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
        setIsSavingMemory(false);
        return;
      }

      // Call memory extraction API
      const isDemoMode = !isLoggedIn || userId === '00000000-0000-0000-0000-000000000001' || userId?.startsWith('demo-');
      const response = await fetch('/api/memories/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': isDemoMode ? 'true' : 'false',
        },
        body: JSON.stringify({
          messages: messages,
          sessionId: sessionId,
          userId: userId,
          forceSave: false // Change to true to save even duplicates
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Memories extracted:', result);
        
        // Show success indicator
        const indicator = document.createElement('div');
        indicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg';
        indicator.textContent = `${result.count || 0}개의 메모리가 저장되었습니다`;
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
        
        // Trigger memory panel refresh by updating key
        setMemoryRefreshKey(prev => prev + 1);
      } else {
        const errorData = await response.json();
        console.error('Memory extraction failed:', errorData);
        throw new Error(errorData.details || 'Failed to extract memories');
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      const indicator = document.createElement('div');
      indicator.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg';
      indicator.textContent = `메모리 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`;
      document.body.appendChild(indicator);
      setTimeout(() => indicator.remove(), 3000);
    } finally {
      setIsSavingMemory(false);
    }
  };


  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setUserName(name);
    localStorage.setItem('userName', name);
  };

  const handleNewSession = async () => {
    // Save current conversation before starting new session
    if (messages.length > 0 && !loadedConversationId && isLoggedIn) {
      await saveConversation();
    }
    
    setMessages([]);
    setUploadedFiles([]);
    setIsViewingHistory(false);
    setLoadedConversationId(null);
    const sessionPrefix = isLoggedIn ? 'user' : isGuest ? 'guest' : 'demo';
    const newSessionId = `${sessionPrefix}-session-${Date.now()}`;
    setSessionId(newSessionId);
    console.log('New session started:', newSessionId);
  };

  const saveConversation = async () => {
    if (messages.length === 0) return;
    
    // Only save conversations for logged-in users
    if (!isLoggedIn) {
      console.log('Skipping conversation save for non-logged-in user');
      return;
    }

    try {
      // AI로 제목 생성
      const title = await generateTitle(messages);
      
      const response = await fetch('/api/demo/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'true',
        },
        body: JSON.stringify({
          title,
          sessionId,
          messages,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLoadedConversationId(data.conversationId);
        console.log('Conversation saved successfully');
        // Refresh conversation list
        setMemoryRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const updateConversation = async (conversationId: string) => {
    if (messages.length === 0) return;
    
    // Only update conversations for logged-in users
    if (!isLoggedIn) {
      console.log('Skipping conversation update for non-logged-in user');
      return;
    }

    try {
      const response = await fetch(`/api/demo/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'true',
        },
        body: JSON.stringify({
          messages,
        }),
      });

      if (response.ok) {
        console.log('Conversation updated successfully');
        setMemoryRefreshKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error updating conversation:', error);
    }
  };

  const generateTitle = async (messages: Array<{ role: string; content: string }>) => {
    try {
      // 대화 내용을 AI로 축약하여 제목 생성 - 사용자와 AI 응답 모두 포함
      const conversationText = messages
        .slice(0, 6) // 처음 6개 메시지만 사용 (사용자 3개, AI 3개 정도)
        .map(m => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content.slice(0, 100)}`)
        .join('\n');

      // 데모 모드에서는 /api/demo/generate-title 사용
      const response = await fetch('/api/demo/generate-title', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-mode': 'true',
        },
        body: JSON.stringify({
          text: conversationText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate title');
      }

      const data = await response.json();
      if (data.title) {
        return data.title.slice(0, 50);
      }
    } catch (error) {
      console.error('Error generating title:', error);
    }

    // AI 생성 실패시 fallback: 첫 사용자 메시지 사용
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
    if (userMessages.length > 50) {
      return userMessages.slice(0, 47) + '...';
    }
    return userMessages || '새 대화';
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Enhanced Sidebar like AGI Space */}
      <div className="w-80 border-r flex flex-col bg-card">
        {/* Header with User Info */}
        <div className="p-4 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                {isLoggedIn ? session?.user?.email : isGuest ? 'Guest User' : 'Demo Mode'}
              </span>
            </div>
            {!isLoggedIn && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => signIn('google')}
              >
                <LogIn className="h-3 w-3 mr-1" />
                Google 로그인
              </Button>
            )}
            {isLoggedIn && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => signOut()}
              >
                Logout
              </Button>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex flex-col gap-0.5">
            <span className="font-medium">현재 시간 (KST)</span>
            <span>{currentTime ? formatKSTTime(currentTime) : 'Loading...'}</span>
          </div>
        </div>

        {/* Tabbed Sidebar Content */}
        <Tabs defaultValue="settings" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4 px-4">
            <TabsTrigger value="settings" className="text-xs">
              <Settings className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger 
              value="memory" 
              className="text-xs"
              disabled={!isLoggedIn}
            >
              <Brain className="h-3 w-3" />
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="text-xs"
              disabled={!isLoggedIn}
            >
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
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-black rounded-full transition-transform ${
                        webSearchEnabled ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Self Learning Toggle - Only for logged-in users */}
                <div className="flex items-center justify-between">
                  <label className="text-sm">
                    자가 학습 {!isLoggedIn && <span className="text-xs text-muted-foreground">(로그인 필요)</span>}
                  </label>
                  <button
                    onClick={() => isLoggedIn && setSelfLearningEnabled(!selfLearningEnabled)}
                    disabled={!isLoggedIn}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      isLoggedIn ? (selfLearningEnabled ? 'bg-primary' : 'bg-gray-300') : 'bg-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white dark:bg-black rounded-full transition-transform ${
                        selfLearningEnabled && isLoggedIn ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

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
                {isLoggedIn ? (
                  <MemoryPanel userId={userId} className="border-0 p-0" refreshKey={memoryRefreshKey} />
                ) : (
                  <div className="text-center py-8">
                    <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      메모리 기능은 로그인 사용자만 이용할 수 있습니다.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => signIn('google')}
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      Google 로그인
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="p-4">
              <div className="space-y-3">
                {isLoggedIn ? (
                  <>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      대화 기록
                    </h3>
                    <ConversationHistory 
                      refreshKey={memoryRefreshKey}
                      onSelectConversation={(conversation) => {
                        console.log('Selected conversation:', conversation);
                        setLoadedConversationId(conversation.id);
                        setIsViewingHistory(false);  // 이어서 대화 가능
                      }}
                      onLoadMessages={(loadedMessages) => {
                        // 로드된 메시지로 현재 대화 교체
                        setMessages(loadedMessages.map(msg => ({
                          role: msg.role,
                          content: msg.content
                        })));
                        // 스크롤을 맨 아래로
                        setTimeout(() => {
                          if (messagesEndRef.current) {
                            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 100);
                      }}
                    />
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">
                      대화 기록은 로그인 사용자만 이용할 수 있습니다.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => signIn('google')}
                    >
                      <LogIn className="h-3 w-3 mr-1" />
                      Google 로그인
                    </Button>
                  </div>
                )}
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
                  uploadedFiles={uploadedFiles.map((f, index) => ({
                    fileId: `file-${index}-${f.filename.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    filename: f.filename,
                    fileType: f.filename.split('.').pop() || 'file',
                    processedContent: f.processedContent
                  }))}
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
            disabled={isSavingMemory}
          >
            {isSavingMemory ? (
              <>
                <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                저장 중...
              </>
            ) : (
              <>
                <Brain className="h-3 w-3 mr-2" />
                기억 저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4 bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                jetXA AI Assistant
              </h1>
              {loadedConversationId ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-1 rounded">
                    💬 대화 이어가기
                  </span>
                  <Button
                    onClick={handleNewSession}
                    size="sm"
                    variant="outline"
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    새 대화
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  고급 멀티모달 AI 어시스턴트 • 세션: {sessionId.slice(-8)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              {webSearchEnabled && (
                <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded">
                  웹 검색 ON
                </span>
              )}
              {selfLearningEnabled && isLoggedIn && (
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
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="text-center max-w-2xl">
                  {/* Logo/Brand */}
                  <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg mb-4">
                      <span className="text-3xl text-white font-bold">XA</span>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      jetXA
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                      Advanced AI Assistant
                    </p>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="p-4 rounded-xl bg-gradient-to-br from-card/30 to-card/50 border border-border/50 cursor-default">
                      <div className="text-2xl mb-2 opacity-80">🎯</div>
                      <div className="text-sm font-medium text-foreground/90">정확한 응답</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        실시간 웹 검색 기반
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-card/30 to-card/50 border border-border/50 cursor-default">
                      <div className="text-2xl mb-2 opacity-80">💡</div>
                      <div className="text-sm font-medium text-foreground/90">맞춤형 AI</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        대화 학습 및 기억
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-card/30 to-card/50 border border-border/50 cursor-default">
                      <div className="text-2xl mb-2 opacity-80">📎</div>
                      <div className="text-sm font-medium text-foreground/90">멀티모달</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        이미지 · 문서 분석
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-card/30 to-card/50 border border-border/50 cursor-default">
                      <div className="text-2xl mb-2 opacity-80">🌏</div>
                      <div className="text-sm font-medium text-foreground/90">다국어</div>
                      <div className="text-xs text-muted-foreground/70 mt-1">
                        한국어 최적화
                      </div>
                    </div>
                  </div>

                  {/* CTA */}
                  <p className="text-sm text-muted-foreground">
                    메시지를 입력하여 시작하세요
                  </p>
                </div>
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
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4 bg-card">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={loadedConversationId ? "대화를 이어서 진행하세요..." : "메시지를 입력하세요..."}
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
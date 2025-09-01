'use client';

import { useState } from 'react';
import { ChatSettings } from '@/components/chat-settings';
import { FileUpload } from '@/components/file-upload';
import { YuriBadge } from '@/components/yuri-badge';
import { ModelSelector } from '@/components/model-selector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/models-config';

export default function DemoPage() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_MODEL_ID);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ filename: string; processedContent: string }>>([]);

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

      // Call the demo chat API directly
      const response = await fetch('/api/demo-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            content: messageWithContext,
          },
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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r p-4 space-y-4">
        <div className="flex items-center gap-2">
          <YuriBadge showVersion />
        </div>
        
        <ChatSettings />
        
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">파일 업로드</h3>
          <FileUpload 
            sessionId="demo" 
            onFilesChange={(files) => {
              setUploadedFiles(files.map(f => ({
                filename: f.filename,
                processedContent: f.processedContent || ''
              })));
            }}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">AI Chat Demo - jetXA Model</h1>
              <p className="text-sm text-muted-foreground">
                Advanced multilingual AI assistant powered by jetXA
              </p>
            </div>
            <ModelSelector 
              selectedModelId={selectedModelId}
              onModelChange={setSelectedModelId}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8">
              <p className="text-2xl mb-2">🚀</p>
              <p className="font-semibold">Welcome to jetXA AI Assistant</p>
              <p className="text-sm">Advanced multilingual AI with Korean expertise</p>
              <p className="text-sm mt-2">How can I help you today? / 무엇을 도와드릴까요?</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="text-sm font-semibold mb-1">
                    {msg.role === 'user' ? '사용자' : 'Yuri'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="text-sm font-semibold mb-1">Yuri</div>
                <div className="flex gap-1">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce delay-100">●</span>
                  <span className="animate-bounce delay-200">●</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
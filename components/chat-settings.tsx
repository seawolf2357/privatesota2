'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Settings, Search, Brain, User } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ChatSettingsProps {
  onSettingsChange?: (settings: ChatSettings) => void;
}

export interface ChatSettings {
  webSearchEnabled: boolean;
  selfLearningEnabled: boolean;
  userName: string;
}

export function ChatSettings({ onSettingsChange }: ChatSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<ChatSettings>({
    webSearchEnabled: true,
    selfLearningEnabled: true,
    userName: '',
  });

  const updateSetting = <K extends keyof ChatSettings>(
    key: K,
    value: ChatSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
    
    // Save to localStorage
    if (key === 'userName') {
      localStorage.setItem('userName', value as string);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Settings className="mr-2 h-4 w-4" />
          설정
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="web-search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              웹 검색
            </Label>
            <Switch
              id="web-search"
              checked={settings.webSearchEnabled}
              onCheckedChange={(checked) =>
                updateSetting('webSearchEnabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="self-learning" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              자가 학습
            </Label>
            <Switch
              id="self-learning"
              checked={settings.selfLearningEnabled}
              onCheckedChange={(checked) =>
                updateSetting('selfLearningEnabled', checked)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              사용자 이름
            </Label>
            <Input
              id="user-name"
              type="text"
              placeholder="이름 입력..."
              value={settings.userName}
              onChange={(e) => updateSetting('userName', e.target.value)}
              className="w-full"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
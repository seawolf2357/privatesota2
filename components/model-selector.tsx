'use client';

import { useState } from 'react';
import { ChevronDown, Check, Sparkles, Clock } from 'lucide-react';
import { AI_MODELS, MODEL_CATEGORIES, type ModelCategory, getModelsByCategory, DEFAULT_MODEL_ID } from '@/lib/ai/models-config';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  className?: string;
}

export function ModelSelector({ selectedModelId, onModelChange, className }: ModelSelectorProps) {
  const [category, setCategory] = useState<ModelCategory>('all');
  
  const models = getModelsByCategory(category);
  const selectedModel = AI_MODELS.find(m => m.id === selectedModelId) || AI_MODELS.find(m => m.id === DEFAULT_MODEL_ID)!;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[180px] justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedModel.icon}</span>
              <span className="font-medium">{selectedModel.name}</span>
              {selectedModel.id === 'jetxa-model' && (
                <Badge variant="default" className="ml-1 px-1 py-0 text-xs">Active</Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[320px]">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Select AI Model</span>
            <div className="flex gap-1">
              {MODEL_CATEGORIES.map(cat => (
                <Button
                  key={cat.value}
                  variant={category === cat.value ? "default" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    setCategory(cat.value);
                  }}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {models.map((model) => (
            <DropdownMenuItem
              key={model.id}
              onClick={() => model.available && onModelChange(model.id)}
              disabled={!model.available}
              className={cn(
                "flex items-start gap-3 p-3 cursor-pointer",
                !model.available && "opacity-50 cursor-not-allowed"
              )}
            >
              <span className="text-xl mt-0.5">{model.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{model.name}</span>
                  {model.id === selectedModelId && model.available && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {model.comingSoon && (
                    <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Coming Soon
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {model.description}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {model.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Max {model.maxTokens} tokens
                  </span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <div className="p-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              <span>jetXA is currently the only active model</span>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
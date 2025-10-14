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
          <Button variant="outline" className="w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{selectedModel.icon}</span>
              <span className="font-medium">{selectedModel.name}</span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side="bottom"
          sideOffset={5}
          alignOffset={-5}
          collisionPadding={10}
          avoidCollisions={true}
          className="w-[350px] p-0 z-50"
        >
          <div className="flex flex-col max-h-[min(400px,calc(100vh-120px))]" style={{ maxHeight: 'min(400px, calc(100vh - 120px))' }}>
            {/* Header - Category Filter */}
            <div className="flex-shrink-0">
              <DropdownMenuLabel className="flex items-center justify-between">
                <div className="flex gap-1 flex-wrap">
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
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1 min-h-0">
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
                  <span className="text-xl mt-0.5 flex-shrink-0">{model.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium break-words">{model.name}</span>
                      {model.id === selectedModelId && model.available && (
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      {model.comingSoon && (
                        <Badge variant="secondary" className="px-1.5 py-0 text-xs flex-shrink-0">
                          <Clock className="h-3 w-3 mr-1" />
                          Coming Soon
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 break-words line-clamp-2">
                      {model.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {model.category}
                      </Badge>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Max {model.maxTokens} tokens
                      </span>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0">
              <DropdownMenuSeparator />
              <div className="p-2 text-xs text-muted-foreground bg-background">
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3 flex-shrink-0" />
                  <span className="break-words">Select a model that best fits your task</span>
                </div>
              </div>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
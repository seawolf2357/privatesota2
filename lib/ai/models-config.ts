/**
 * AI Model Configuration
 * Centralized configuration for all AI models
 */

export interface AIModel {
  id: string;
  name: string;
  provider: 'friendli' | 'openai' | 'google' | 'anthropic' | 'xai';
  description: string;
  available: boolean;
  comingSoon?: boolean;
  icon?: string;
  maxTokens: number;
  temperature?: number;
  category: 'chat' | 'reasoning' | 'coding' | 'creative';
}

export const AI_MODELS: AIModel[] = [
  // Active Model - Yuri as jetXA
  {
    id: 'jetxa-model',
    name: 'jetXA',
    provider: 'friendli',
    description: 'Advanced multilingual AI with Korean expertise',
    available: true,
    icon: '🚀',
    maxTokens: 2000,
    temperature: 0.8,
    category: 'chat',
  },
  
  // Coming Soon Models (Placeholders)
  {
    id: 'gpt5',
    name: 'GPT-5',
    provider: 'openai',
    description: 'Most advanced reasoning and analysis model',
    available: false,
    comingSoon: true,
    icon: '🧠',
    maxTokens: 8000,
    category: 'reasoning',
  },
  {
    id: 'gemini-25',
    name: 'Gemini 2.5',
    provider: 'google',
    description: 'Multimodal AI with superior capabilities',
    available: false,
    comingSoon: true,
    icon: '💎',
    maxTokens: 6000,
    category: 'chat',
  },
  {
    id: 'claude-4',
    name: 'Claude 4',
    provider: 'anthropic',
    description: 'Deep reasoning and creative excellence',
    available: false,
    comingSoon: true,
    icon: '🎭',
    maxTokens: 5000,
    category: 'creative',
  },
  {
    id: 'llama-4',
    name: 'Llama 4',
    provider: 'xai',
    description: 'Open-source giant for complex tasks',
    available: false,
    comingSoon: true,
    icon: '🦙',
    maxTokens: 7000,
    category: 'coding',
  },
];

// Model selection types
export type ModelCategory = 'all' | 'chat' | 'reasoning' | 'coding' | 'creative';

export const MODEL_CATEGORIES: { value: ModelCategory; label: string }[] = [
  { value: 'all', label: 'All Models' },
  { value: 'chat', label: 'Chat' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'coding', label: 'Coding' },
  { value: 'creative', label: 'Creative' },
];

// Get available models
export function getAvailableModels(): AIModel[] {
  return AI_MODELS.filter(model => model.available);
}

// Get model by ID
export function getModelById(id: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === id);
}

// Get models by category
export function getModelsByCategory(category: ModelCategory): AIModel[] {
  if (category === 'all') return AI_MODELS;
  return AI_MODELS.filter(model => model.category === category);
}

// Default model
export const DEFAULT_MODEL_ID = 'jetxa-model';
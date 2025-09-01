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
    id: 'gpt5-nano',
    name: 'GPT-5 NANO',
    provider: 'openai',
    description: 'Ultra-efficient next-gen language model',
    available: false,
    comingSoon: true,
    icon: '🧠',
    maxTokens: 4000,
    category: 'reasoning',
  },
  {
    id: 'gemini-25-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    description: 'Lightning-fast responses with minimal latency',
    available: false,
    comingSoon: true,
    icon: '⚡',
    maxTokens: 3000,
    category: 'chat',
  },
  {
    id: 'claude-4-haiku',
    name: 'Claude 4 Haiku',
    provider: 'anthropic',
    description: 'Concise and poetic responses',
    available: false,
    comingSoon: true,
    icon: '🌸',
    maxTokens: 2500,
    category: 'creative',
  },
  {
    id: 'llama-4-turbo',
    name: 'Llama 4 Turbo',
    provider: 'xai',
    description: 'Open-source powerhouse for coding',
    available: false,
    comingSoon: true,
    icon: '🦙',
    maxTokens: 3500,
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
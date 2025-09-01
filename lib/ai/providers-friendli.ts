import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { YURI_CONFIG } from './yuri-config';

// Friendli AI configuration (from Discord bot)
const friendliApiKey = process.env.FRIENDLI_API_KEY || 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const friendliBaseUrl = 'https://api.friendli.ai/dedicated/v1';
const friendliModel = 'dep86pjolcjjnv8';

// Create Friendli provider using OpenAI compatibility
// Friendli AI supports OpenAI-compatible API format
const friendli = createOpenAI({
  apiKey: friendliApiKey,
  baseURL: friendliBaseUrl,
});

// Custom provider with Friendli integration for jetXA (formerly Yuri)
export const myFriendliProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // jetXA Model - Advanced multilingual AI (Powered by Friendli AI)
        'jetxa-model': friendli(friendliModel),
        'chat-model': friendli(friendliModel), // Default chat model
        'yuri-model': friendli(friendliModel), // Legacy alias for compatibility
        
        // Yuri Reasoning model with middleware
        'chat-model-reasoning': wrapLanguageModel({
          model: friendli(friendliModel),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // Yuri Title generation model
        'title-model': friendli(friendliModel),
        
        // Yuri Artifact generation model
        'artifact-model': friendli(friendliModel),
        
        // Fallback models
        'fallback-fireworks': createOpenAI({
          apiKey: process.env.FIREWORKS_API_KEY || '',
          baseURL: 'https://api.fireworks.ai/inference/v1',
        })('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507'),
        
        'fallback-xai': xai('grok-2-1212'),
      },
    });

// Export provider selection based on environment
export const myProvider = process.env.USE_FRIENDLI === 'true' 
  ? myFriendliProvider 
  : process.env.USE_FIREWORKS === 'true'
    ? customProvider({
        languageModels: {
          'chat-model': createOpenAI({
            apiKey: process.env.FIREWORKS_API_KEY || '',
            baseURL: 'https://api.fireworks.ai/inference/v1',
          })('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507'),
          'chat-model-reasoning': wrapLanguageModel({
            model: createOpenAI({
              apiKey: process.env.FIREWORKS_API_KEY || '',
              baseURL: 'https://api.fireworks.ai/inference/v1',
            })('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507'),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          }),
          'title-model': createOpenAI({
            apiKey: process.env.FIREWORKS_API_KEY || '',
            baseURL: 'https://api.fireworks.ai/inference/v1',
          })('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507'),
          'artifact-model': createOpenAI({
            apiKey: process.env.FIREWORKS_API_KEY || '',
            baseURL: 'https://api.fireworks.ai/inference/v1',
          })('accounts/fireworks/models/qwen3-235b-a22b-instruct-2507'),
        },
      })
    : isTestEnvironment
      ? customProvider({
          languageModels: {
            'chat-model': chatModel,
            'chat-model-reasoning': reasoningModel,
            'title-model': titleModel,
            'artifact-model': artifactModel,
          },
        })
      : customProvider({
          languageModels: {
            'chat-model': xai('grok-2-vision-1212'),
            'chat-model-reasoning': wrapLanguageModel({
              model: xai('grok-3-mini-beta'),
              middleware: extractReasoningMiddleware({ tagName: 'think' }),
            }),
            'title-model': xai('grok-2-1212'),
            'artifact-model': xai('grok-2-1212'),
          },
          imageModels: {
            'small-model': xai.imageModel('grok-2-image'),
          },
        });
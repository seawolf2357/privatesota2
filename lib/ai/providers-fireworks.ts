import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
  createOpenAI,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { YURI_CONFIG } from './yuri-config';

// Fireworks AI configuration for Yuri
const fireworksApiKey = process.env.FIREWORKS_API_KEY || '';
const fireworksBaseUrl = 'https://api.fireworks.ai/inference/v1';

// Create Fireworks provider using OpenAI compatibility
const fireworks = createOpenAI({
  apiKey: fireworksApiKey,
  baseURL: fireworksBaseUrl,
});

// Yuri model configuration
const YURI_MODEL = YURI_CONFIG.model;

// Custom provider with Fireworks integration
export const myFireworksProvider = isTestEnvironment
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
        // Yuri AI Assistant - Main chat model
        'chat-model': fireworks(YURI_MODEL),
        'yuri-model': fireworks(YURI_MODEL), // Alias for Yuri
        
        // Yuri Reasoning model with middleware
        'chat-model-reasoning': wrapLanguageModel({
          model: fireworks(YURI_MODEL),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        
        // Yuri Title generation model
        'title-model': fireworks(YURI_MODEL),
        
        // Yuri Artifact generation model
        'artifact-model': fireworks(YURI_MODEL),
        
        // Fallback to xAI if needed
        'fallback-model': xai('grok-2-1212'),
      },
    });

// Export both providers
export const myProvider = process.env.USE_FIREWORKS === 'true' 
  ? myFireworksProvider 
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
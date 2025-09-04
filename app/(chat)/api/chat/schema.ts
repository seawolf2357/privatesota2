import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum([
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]),
  name: z.string().min(1).max(100),
  url: z.string().url().default(''), // Always provide a URL, even if empty
  data: z.string().optional(), // Base64 encoded data for multimodal
  content: z.string().optional(), // Extracted text content
});

const partSchema = z.union([textPartSchema, filePartSchema]);

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user']),
    parts: z.array(partSchema),
    attachments: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      url: z.string().optional(),
      data: z.string().optional(),
      content: z.string().optional(),
    })).optional(),
  }),
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning', 'jetxa-model', 'yuri-model']),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;

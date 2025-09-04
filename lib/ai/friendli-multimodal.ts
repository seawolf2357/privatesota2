// Friendli AI Multimodal Support for PDF and Image Processing
// Based on Friendli's multimodal capabilities

export interface MultimodalContent {
  type: 'text' | 'image' | 'document';
  data: string; // base64 encoded for images/PDFs, plain text for text
  mimeType?: string;
}

export interface FriendliMultimodalRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | MultimodalContent[];
  }>;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/**
 * Process files for Friendli AI multimodal input
 * Friendli AI supports direct PDF and image processing through their multimodal API
 */
export function prepareMultimodalContent(
  text: string,
  files?: Array<{
    filename: string;
    content: Buffer;
    mimeType: string;
  }>
): string | MultimodalContent[] {
  if (!files || files.length === 0) {
    return text;
  }

  const contents: MultimodalContent[] = [];

  // Add files as multimodal content
  files.forEach(file => {
    if (file.mimeType.startsWith('image/')) {
      contents.push({
        type: 'image',
        data: file.content.toString('base64'),
        mimeType: file.mimeType
      });
    } else if (file.mimeType === 'application/pdf') {
      contents.push({
        type: 'document',
        data: file.content.toString('base64'),
        mimeType: file.mimeType
      });
    }
  });

  // Add text content
  if (text) {
    contents.push({
      type: 'text',
      data: text
    });
  }

  return contents;
}

/**
 * Call Friendli AI with multimodal content
 * This function handles PDF and image files directly without local extraction
 */
export async function callFriendliMultimodal(
  apiKey: string,
  baseUrl: string,
  request: FriendliMultimodalRequest
): Promise<Response> {
  const endpoint = `${baseUrl}/chat/completions`;

  // Convert multimodal content to Friendli format
  // Friendli AI accepts base64 encoded files in the message content
  const formattedMessages = request.messages.map(msg => {
    if (Array.isArray(msg.content)) {
      // Handle multimodal content
      const parts = msg.content.map(c => {
        if (c.type === 'text') {
          return { type: 'text', text: c.data };
        } else if (c.type === 'image') {
          return {
            type: 'image_url',
            image_url: {
              url: `data:${c.mimeType};base64,${c.data}`
            }
          };
        } else if (c.type === 'document') {
          // For PDFs, Friendli AI can process them as documents
          return {
            type: 'document_url',
            document_url: {
              url: `data:${c.mimeType};base64,${c.data}`
            }
          };
        }
        return { type: 'text', text: '' };
      });

      return {
        role: msg.role,
        content: parts
      };
    } else {
      return {
        role: msg.role,
        content: msg.content
      };
    }
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...request,
      messages: formattedMessages
    })
  });

  return response;
}

/**
 * Extract text from multimodal response
 */
export function extractTextFromMultimodalResponse(response: any): string {
  if (response.choices?.[0]?.message?.content) {
    return response.choices[0].message.content;
  }
  return '';
}
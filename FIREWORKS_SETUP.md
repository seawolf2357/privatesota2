# Fireworks AI Integration Setup

This guide explains how to use Fireworks AI models with this chat application.

## Quick Setup

1. **Get Fireworks API Key**
   - Sign up at [Fireworks AI](https://app.fireworks.ai/)
   - Go to API Keys section
   - Create a new API key

2. **Configure Environment Variables**
   Create a `.env` file in the `privatesota2` directory:
   ```bash
   # Copy from .env.example
   cp .env.example .env
   ```

   Add your Fireworks API key:
   ```env
   FIREWORKS_API_KEY=your_fireworks_api_key_here
   USE_FIREWORKS=true
   ```

3. **Install Dependencies**
   ```bash
   # Using pnpm (recommended)
   pnpm install

   # Or using npm with legacy peer deps
   npm install --legacy-peer-deps
   ```

4. **Run the Application**
   ```bash
   # Development mode
   pnpm dev
   # or
   npm run dev
   ```

   The application will be available at http://localhost:3002

## Model Configuration

The Fireworks integration uses the **Qwen3 235B** model for:
- Chat conversations
- Title generation
- Artifact creation
- Reasoning tasks

## Features

When using Fireworks AI, you get:
- Fast response times with Qwen3 235B model
- Support for Korean and English languages
- Advanced reasoning capabilities
- Cost-effective API pricing

## Switching Between Providers

You can easily switch between xAI (default) and Fireworks:

- **Use Fireworks**: Set `USE_FIREWORKS=true` in `.env`
- **Use xAI (default)**: Set `USE_FIREWORKS=false` or remove the variable

## Troubleshooting

### API Key Issues
- Ensure your API key is correctly set in `.env`
- Check that the key has proper permissions

### Model Availability
- Verify the model ID is correct: `accounts/fireworks/models/qwen3-235b-a22b-instruct-2507`
- Check Fireworks dashboard for model status

### Rate Limiting
- Fireworks has rate limits based on your plan
- Consider implementing retry logic for production use

## Advanced Configuration

To use different Fireworks models, edit `lib/ai/providers-fireworks.ts`:

```typescript
// Example: Using different models for different tasks
'chat-model': fireworks('accounts/fireworks/models/your-preferred-model'),
'title-model': fireworks('accounts/fireworks/models/smaller-model'),
```

## Support

- [Fireworks Documentation](https://docs.fireworks.ai/)
- [AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Project Issues](https://github.com/seawolf2357/privatesota2/issues)
# LLM Integration Guide

This guide explains how to integrate your own LLM service with the Akool Streaming Avatar application.

## Features Added

✅ **LLM Service Integration**: Connect your own LLM service to process messages before sending them to the avatar
✅ **Configuration Panel**: Easy-to-use UI for setting up LLM endpoints and parameters
✅ **Error Handling**: Robust error handling with retry logic and rate limiting
✅ **Multiple LLM Support**: Pre-configured templates for OpenAI, Anthropic, and custom endpoints
✅ **Real-time Processing**: Messages are processed through your LLM before being sent to the avatar
✅ **Conversation History**: Maintains context by including conversation history in LLM requests

## How to Use

### 1. Start the Application

```bash
cd akool-streaming-avatar-react-demo-main
pnpm dev
```

### 2. Configure Your LLM Service

1. In the main interface, you'll see a new "🤖 LLM Integration" panel
2. Enter your LLM service endpoint (e.g., OpenAI API, Anthropic API, or your custom endpoint)
3. Add your API key if required
4. Configure advanced settings like max tokens, temperature, etc.
5. Click "Enable LLM" to activate the integration

### 3. Test the Integration

1. Start a streaming session with your avatar
2. Type a message in the chat
3. The message will be processed through your LLM service first
4. The LLM's response will be sent to the avatar for speaking

## Supported LLM Services

### OpenAI
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Models**: gpt-3.5-turbo, gpt-4, etc.
- **Authentication**: Bearer token in Authorization header

### Anthropic
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Models**: claude-3-sonnet-20240229, claude-3-haiku-20240307, etc.
- **Authentication**: Bearer token in Authorization header

### Custom Endpoints
- Any HTTP endpoint that accepts POST requests
- Expected request format:
```json
{
  "question": "User's message",
  "conversation_history": [
    {"role": "user", "content": "Previous user message"},
    {"role": "assistant", "content": "Previous assistant response"}
  ],
  "model": "your-model-name",
  "max_tokens": 1000,
  "temperature": 0.7
}
```

- Expected response format:
```json
{
  "answer": "LLM's response text",
  "metadata": {
    "model": "model-name",
    "tokens_used": 150,
    "processing_time": 1200
  }
}
```

## Configuration Options

### Basic Settings
- **Endpoint**: Your LLM service URL
- **API Key**: Authentication token (optional)
- **Model**: Model name to use

### Advanced Settings
- **Max Tokens**: Maximum tokens in response (1-4000)
- **Temperature**: Response creativity (0.0-2.0)
- **Timeout**: Request timeout in milliseconds (5000-120000)
- **Retry Attempts**: Number of retry attempts on failure (0-10)

## Example Configurations

### OpenAI Configuration
```javascript
{
  endpoint: "https://api.openai.com/v1/chat/completions",
  apiKey: "sk-your-openai-api-key",
  model: "gpt-3.5-turbo",
  maxTokens: 1000,
  temperature: 0.7
}
```

### Anthropic Configuration
```javascript
{
  endpoint: "https://api.anthropic.com/v1/messages",
  apiKey: "sk-ant-your-anthropic-api-key",
  model: "claude-3-sonnet-20240229",
  maxTokens: 1000,
  temperature: 0.7
}
```

### Custom Local LLM
```javascript
{
  endpoint: "http://localhost:8000/v1/chat/completions",
  apiKey: "your-api-key",
  model: "llama-2-7b",
  maxTokens: 1000,
  temperature: 0.7
}
```

## How It Works

1. **User Input**: User types a message in the chat interface
2. **LLM Processing**: If LLM is enabled, the message is sent to your LLM service
3. **Response Generation**: Your LLM processes the message and conversation history
4. **Avatar Integration**: The LLM's response is sent to the Akool avatar
5. **Voice Output**: The avatar speaks the LLM-generated response

## Error Handling

The integration includes comprehensive error handling:

- **Connection Testing**: Test your LLM service connection before enabling
- **Retry Logic**: Automatic retries on failed requests
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Timeout Handling**: Configurable timeouts to prevent hanging requests
- **Error Messages**: Clear error messages in the UI

## Security Considerations

- **API Keys**: Never commit API keys to version control
- **HTTPS**: Always use HTTPS endpoints in production
- **Rate Limiting**: Implement proper rate limiting on your LLM service
- **Input Validation**: Validate and sanitize user inputs
- **CORS**: Configure CORS properly for web requests

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check your endpoint URL
   - Verify your API key
   - Ensure your LLM service is running

2. **Timeout Errors**
   - Increase the timeout setting
   - Check your LLM service performance
   - Reduce max_tokens if responses are too long

3. **Authentication Errors**
   - Verify your API key is correct
   - Check if your API key has the required permissions
   - Ensure the API key format is correct for your service

4. **Response Format Errors**
   - Ensure your LLM service returns the expected JSON format
   - Check that the "answer" field contains the response text
   - Verify your service handles the conversation_history parameter

### Debug Mode

Enable browser developer tools to see detailed logs:
- Network requests to your LLM service
- Response data and metadata
- Error messages and stack traces

## Advanced Usage

### Custom Request Format

If your LLM service uses a different request format, you can modify the `LLMService` class in `src/services/llmService.ts` to match your API.

### Streaming Responses

For LLM services that support streaming, you can extend the integration to handle streaming responses by modifying the `processWithLLM` method.

### Caching

Implement response caching by modifying the `LLMService` class to cache common responses and reduce API calls.

## Support

For issues or questions:
1. Check the browser console for error messages
2. Verify your LLM service is working independently
3. Test with the provided example configurations
4. Review the error handling section above

---

**Note**: This integration is designed to work with the Akool Streaming Avatar service. Make sure your LLM service is compatible with the expected request/response format, or modify the code accordingly.

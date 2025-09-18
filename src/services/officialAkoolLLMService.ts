/**
 * Official Akool LLM Integration Service
 * 
 * This service implements the exact pattern from Akool's official documentation
 * for integrating LLM services with the streaming avatar.
 */

import { RTCClient } from '../agoraHelper';

// Define the LLM service response interface (as per official docs)
interface LLMResponse {
  answer: string;
}

// LLM Service Configuration
interface LLMServiceConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export class OfficialAkoolLLMService {
  private config: LLMServiceConfig;
  private client: RTCClient | null = null;

  constructor(config: LLMServiceConfig) {
    this.config = config;
  }

  /**
   * Set the RTC client for avatar communication
   */
  setClient(client: RTCClient) {
    this.client = client;
  }

  /**
   * Set avatar to retelling mode (Mode 1) as per official docs
   */
  async setAvatarToRetellingMode(): Promise<void> {
    if (!this.client) {
      throw new Error('RTC client not set');
    }

    try {
      // Import setAvatarParams from agoraHelper
      const { setAvatarParams } = await import('../agoraHelper');
      
      await setAvatarParams(this.client, {
        mode: 1, // Retelling mode as per official docs
      });
      
      console.log('✅ Avatar set to retelling mode (Mode 1)');
    } catch (error) {
      console.error('❌ Failed to set avatar to retelling mode:', error);
      throw error;
    }
  }

  /**
   * Process question with LLM service (as per official docs)
   */
  async processWithLLM(question: string): Promise<LLMResponse> {
    try {
      console.log('🔍 Processing with LLM service:', { question, endpoint: this.config.endpoint });

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
        body: JSON.stringify({
          question,
        })
      });

      if (!response.ok) {
        throw new Error(`LLM service request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ LLM service response received:', { answer: result.answer });
      return result;
    } catch (error) {
      console.error('❌ Error processing with LLM:', error);
      throw error;
    }
  }

  /**
   * Send message to avatar with LLM processing (as per official docs)
   */
  async sendMessageToAvatarWithLLM(question: string): Promise<void> {
    if (!this.client) {
      throw new Error('RTC client not set');
    }

    try {
      console.log('🚀 Starting official Akool LLM flow for question:', question);

      // Step 1: Set avatar to retelling mode
      await this.setAvatarToRetellingMode();

      // Step 2: Process the question with LLM service
      const llmResponse = await this.processWithLLM(question);

      // Step 3: Use chunked message sending for large LLM responses
      const messageId = `msg-${Date.now()}`;
      console.log('📤 Sending LLM response to avatar:', {
        textLength: llmResponse.answer.length,
        textPreview: llmResponse.answer.substring(0, 100) + '...'
      });

      // Step 4: Send the processed message to the avatar using chunked sending
      const { sendMessageToAvatar } = await import('../agoraHelper');
      await sendMessageToAvatar(this.client, messageId, llmResponse.answer);
      
      console.log('✅ Message sent to avatar successfully using official Akool pattern');

    } catch (error) {
      console.error('❌ Error in LLM-enhanced message sending:', error);
      throw error;
    }
  }

  /**
   * Test the LLM service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.processWithLLM('Test connection');
      return !!testResponse.answer;
    } catch (error) {
      console.error('❌ LLM service connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create an instance with Azure OpenAI configuration
 */
export function createAzureOpenAILLMService(): OfficialAkoolLLMService {
  const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
  const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
  const deployment = import.meta.env.VITE_AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
  const apiVersion = import.meta.env.VITE_AZURE_OPENAI_API_VERSION || '2024-05-01-preview';

  if (!endpoint || !apiKey) {
    throw new Error('Azure OpenAI configuration missing. Please set VITE_AZURE_OPENAI_ENDPOINT and VITE_AZURE_OPENAI_KEY');
  }

  // Construct the full endpoint URL
  const fullEndpoint = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  return new OfficialAkoolLLMService({
    endpoint: fullEndpoint,
    apiKey: apiKey,
    headers: {
      'api-key': apiKey, // Azure OpenAI uses api-key header
    }
  });
}

/**
 * Create an instance with OpenAI configuration
 */
export function createOpenAILLMService(): OfficialAkoolLLMService {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key missing. Please set VITE_OPENAI_API_KEY');
  }

  return new OfficialAkoolLLMService({
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: apiKey,
  });
}

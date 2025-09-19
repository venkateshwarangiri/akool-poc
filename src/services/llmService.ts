// LLM Service Integration for Akool Streaming Avatar
// This service allows you to integrate your own LLM to process messages before sending them to the avatar

export interface LLMResponse {
  answer: string;
  metadata?: {
    model?: string;
    tokens_used?: number;
    processing_time?: number;
    confidence?: number;
  };
}

export interface LLMConfig {
  endpoint: string;
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface LLMRequest {
  question: string;
  context?: string;
  conversation_history?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  metadata?: Record<string, unknown>;
}

export class LLMService {
  private config: LLMConfig;
  // private requestQueue: Array<() => Promise<void>> = [];
  // private isProcessing = false;
  private rateLimitDelay = 0;

  constructor(config: LLMConfig) {
    this.config = {
      timeout: 30000, // 30 seconds default
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      maxTokens: 1000,
      temperature: 0.7,
      ...config,
    };
  }

  /**
   * Process a question through the LLM service
   */
  async processWithLLM(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Add rate limiting
      await this.rateLimit();

      const response = await this.makeRequest(request);
      
      const processingTime = Date.now() - startTime;
      
      // Parse response based on the service type
      let answer = '';
      let metadata = response.metadata || {};
      
      if (this.config.endpoint.includes('openai.azure.com')) {
        // Azure OpenAI response format
        answer = response.choices?.[0]?.message?.content || '';
        metadata = {
          ...metadata,
          model: response.model || this.config.model,
          usage: response.usage,
          finish_reason: response.choices?.[0]?.finish_reason
        };
      } else {
        // Standard format
        answer = response.answer || response.text || response.response || response.content || '';
      }
      
      return {
        answer: answer,
        metadata: {
          ...metadata,
          processing_time: processingTime,
          model: this.config.model,
        },
      };
    } catch (error) {
      console.error('Error processing with LLM:', error);
      throw new Error(`LLM service request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make the actual HTTP request to the LLM service
   */
  private async makeRequest(request: LLMRequest): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.apiKey) {
        // Check if this is Azure OpenAI (different header format)
        if (this.config.endpoint.includes('openai.azure.com')) {
          headers['api-key'] = this.config.apiKey;
        } else {
          headers['Authorization'] = `Bearer ${this.config.apiKey}`;
        }
      }

      // Azure OpenAI expects a different request format
      let requestBody: any;
      
      if (this.config.endpoint.includes('openai.azure.com')) {
        // Azure OpenAI format
        const messages = [];
        
        // Add system message if context is provided
        if (request.context) {
          messages.push({
            role: 'system',
            content: `You are a helpful AI assistant. Use the following context to answer questions: ${request.context}`
          });
        }
        
        // Add conversation history
        if (request.conversation_history && request.conversation_history.length > 0) {
          messages.push(...request.conversation_history);
        }
        
        // Add user question
        messages.push({
          role: 'user',
          content: request.question
        });
        
        requestBody = {
          messages: messages,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          stream: false
        };
      } else {
        // Standard OpenAI/other LLM format
        requestBody = {
          question: request.question,
          context: request.context,
          conversation_history: request.conversation_history,
          model: this.config.model,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          ...request.metadata,
        };
      }

      console.log('🔧 LLM Service Debug:', {
        endpoint: this.config.endpoint,
        model: this.config.model,
        hasApiKey: !!this.config.apiKey,
        isAzure: this.config.endpoint.includes('openai.azure.com'),
        requestBody: requestBody
      });

      // Ensure endpoint is treated as absolute URL
      const endpoint = this.config.endpoint.startsWith('http') 
        ? this.config.endpoint 
        : `https://${this.config.endpoint}`;
        
      console.log('🔧 Making request to:', endpoint);
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Simple rate limiting implementation
   */
  private async rateLimit(): Promise<void> {
    if (this.rateLimitDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig {
    return { ...this.config };
  }

  /**
   * Test the LLM service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.processWithLLM({
        question: 'Hello, this is a test message.',
      });
      return true;
    } catch (error) {
      console.error('LLM service test failed:', error);
      return false;
    }
  }
}

// Default LLM configurations for popular services
export const LLMConfigs = {
  openai: (apiKey: string, model: string = 'gpt-3.5-turbo'): LLMConfig => ({
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey,
    model,
    maxTokens: 1000,
    temperature: 0.7,
  }),

  anthropic: (apiKey: string, model: string = 'claude-3-sonnet-20240229'): LLMConfig => ({
    endpoint: 'https://api.anthropic.com/v1/messages',
    apiKey,
    model,
    maxTokens: 1000,
    temperature: 0.7,
  }),

  // Azure OpenAI configuration
  azureOpenAI: (
    apiKey: string, 
    endpoint: string, 
    deployment: string = 'gpt-4o',
    apiVersion: string = '2024-05-01-preview'
  ): LLMConfig => {
    // Ensure endpoint doesn't end with slash to avoid double slashes
    const baseEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    return {
      endpoint: `${baseEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`,
      apiKey,
      model: deployment,
      maxTokens: 1000,
      temperature: 0.7,
    };
  },

  custom: (endpoint: string, apiKey?: string): LLMConfig => ({
    endpoint,
    apiKey,
    maxTokens: 1000,
    temperature: 0.7,
  }),
};

// Utility function to create LLM service with retry logic
export async function createLLMServiceWithRetry(
  config: LLMConfig,
  maxRetries: number = 3
): Promise<LLMService> {
  const service = new LLMService(config);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isConnected = await service.testConnection();
      if (isConnected) {
        return service;
      }
    } catch (error) {
      console.warn(`LLM service connection attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) {
        throw new Error(`Failed to connect to LLM service after ${maxRetries} attempts`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  
  return service;
}

import { getAzureConfig } from '../config/azureConfig';

// Utility function to create Azure OpenAI service from environment variables
export function createAzureOpenAIService(): LLMService {
  const config = getAzureConfig();
  
  if (!config.apiKey || !config.endpoint || config.apiKey === 'YOUR_AZURE_OPENAI_KEY_HERE') {
    throw new Error('Azure OpenAI credentials not configured. Please set VITE_AZURE_OPENAI_KEY and VITE_AZURE_OPENAI_ENDPOINT environment variables or update the config file.');
  }

  const llmConfig = LLMConfigs.azureOpenAI(config.apiKey, config.endpoint, config.gpt4oDeployment, config.apiVersion);
  return new LLMService(llmConfig);
}

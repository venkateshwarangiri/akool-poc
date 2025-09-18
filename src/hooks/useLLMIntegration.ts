import { useState, useCallback, useRef, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { LLMService, LLMConfig, LLMRequest, LLMResponse } from '../services/llmService';

export interface LLMIntegrationState {
  isEnabled: boolean;
  isProcessing: boolean;
  lastResponse?: LLMResponse;
  error?: string;
  config: LLMConfig;
}

export interface UseLLMIntegrationReturn {
  state: LLMIntegrationState;
  enableLLM: (config: LLMConfig) => Promise<void>;
  disableLLM: () => void;
  updateConfig: (config: Partial<LLMConfig>) => void;
  sendMessageToAvatarWithLLM: (client: RTCClient, question: string) => Promise<void>;
  testConnection: () => Promise<boolean>;
  clearError: () => void;
}

export function useLLMIntegration(): UseLLMIntegrationReturn {
  const [state, setState] = useState<LLMIntegrationState>(() => {
    // Load state from localStorage on initialization
    const savedState = localStorage.getItem('llmIntegrationState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        return {
          isEnabled: parsed.isEnabled || false,
          isProcessing: false, // Always start with not processing
          config: parsed.config || {
            endpoint: '',
            timeout: 30000,
            retryAttempts: 3,
            retryDelay: 1000,
          },
        };
      } catch (error) {
        console.warn('Failed to parse saved LLM state:', error);
      }
    }
    
    return {
      isEnabled: false,
      isProcessing: false,
      config: {
        endpoint: '',
        timeout: 30000,
        retryAttempts: 3,
        retryDelay: 1000,
      },
    };
  });

  const llmServiceRef = useRef<LLMService | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Save state to localStorage
  const saveStateToStorage = useCallback((newState: LLMIntegrationState) => {
    try {
      localStorage.setItem('llmIntegrationState', JSON.stringify({
        isEnabled: newState.isEnabled,
        config: newState.config,
      }));
    } catch (error) {
      console.warn('Failed to save LLM state to localStorage:', error);
    }
  }, []);

  // Initialize LLM service when enabled
  const enableLLM = useCallback(async (config: LLMConfig) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
      
      const service = new LLMService(config);
      const isConnected = await service.testConnection();
      
      if (!isConnected) {
        throw new Error('Failed to connect to LLM service');
      }
      
      llmServiceRef.current = service;
      const newState = {
        ...state,
        isEnabled: true,
        isProcessing: false,
        config,
        error: undefined,
      };
      setState(newState);
      saveStateToStorage(newState);
      
      console.log('LLM service enabled successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isEnabled: false,
        isProcessing: false,
        error: errorMessage,
      }));
      console.error('Failed to enable LLM service:', error);
    }
  }, []);

  // Disable LLM service
  const disableLLM = useCallback(() => {
    llmServiceRef.current = null;
    conversationHistoryRef.current = [];
    const newState = {
      ...state,
      isEnabled: false,
      isProcessing: false,
      lastResponse: undefined,
      error: undefined,
    };
    setState(newState);
    saveStateToStorage(newState);
    console.log('LLM service disabled');
  }, [state, saveStateToStorage]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<LLMConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...newConfig },
    }));
    
    if (llmServiceRef.current) {
      llmServiceRef.current.updateConfig(newConfig);
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!llmServiceRef.current) {
      return false;
    }
    
    try {
      return await llmServiceRef.current.testConnection();
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Send message to avatar with LLM processing
  const sendMessageToAvatarWithLLM = useCallback(async (
    client: RTCClient,
    question: string
  ) => {
    if (!llmServiceRef.current || !state.isEnabled) {
      throw new Error('LLM service is not enabled');
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

      // Add user message to conversation history
      conversationHistoryRef.current.push({ role: 'user', content: question });

      // Prepare LLM request
      const llmRequest: LLMRequest = {
        question,
        conversation_history: conversationHistoryRef.current.slice(-10), // Keep last 10 messages
        metadata: {
          timestamp: Date.now(),
          source: 'akool-avatar',
        },
      };

      // Process the question with LLM service
      const llmResponse = await llmServiceRef.current.processWithLLM(llmRequest);

      // Add assistant response to conversation history
      conversationHistoryRef.current.push({ role: 'assistant', content: llmResponse.answer });

      // Use chunked message sending for large LLM responses
      const messageId = `msg-${Date.now()}`;
      const { sendMessageToAvatar } = await import('../agoraHelper');
      await sendMessageToAvatar(client, messageId, llmResponse.answer);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResponse: llmResponse,
        error: undefined,
      }));

      console.log('Message sent to avatar with LLM processing:', {
        originalQuestion: question,
        llmResponse: llmResponse.answer,
        metadata: llmResponse.metadata,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      
      console.error('Error in LLM-enhanced message sending:', error);
      throw error;
    }
  }, [state.isEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      llmServiceRef.current = null;
      conversationHistoryRef.current = [];
    };
  }, []);

  return {
    state,
    enableLLM,
    disableLLM,
    updateConfig,
    sendMessageToAvatarWithLLM,
    testConnection,
    clearError,
  };
}

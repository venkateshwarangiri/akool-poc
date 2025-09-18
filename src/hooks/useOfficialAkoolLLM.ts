/**
 * Official Akool LLM Integration Hook
 * 
 * This hook integrates the official Akool LLM service pattern with the existing RAG system
 * to provide a clean, tested implementation that follows Akool's documentation exactly.
 */

import { useState, useRef, useCallback } from 'react';
import { OfficialAkoolLLMService, createAzureOpenAILLMService, createOpenAILLMService } from '../services/officialAkoolLLMService';
import { RTCClient } from '../agoraHelper';

interface OfficialLLMState {
  isEnabled: boolean;
  isProcessing: boolean;
  error: string | undefined;
  lastResponse: string | undefined;
  serviceType: 'azure' | 'openai' | null;
}

export const useOfficialAkoolLLM = () => {
  const [state, setState] = useState<OfficialLLMState>({
    isEnabled: false,
    isProcessing: false,
    error: undefined,
    lastResponse: undefined,
    serviceType: null,
  });

  const llmServiceRef = useRef<OfficialAkoolLLMService | null>(null);
  const clientRef = useRef<RTCClient | null>(null);

  /**
   * Initialize the LLM service
   */
  const initializeService = useCallback(async (serviceType: 'azure' | 'openai' = 'azure') => {
    try {
      console.log('🔧 Initializing Official Akool LLM Service:', serviceType);

      let service: OfficialAkoolLLMService;
      
      if (serviceType === 'azure') {
        service = createAzureOpenAILLMService();
      } else {
        service = createOpenAILLMService();
      }

      // Test the connection
      const isConnected = await service.testConnection();
      if (!isConnected) {
        throw new Error('LLM service connection test failed');
      }

      llmServiceRef.current = service;
      setState(prev => ({
        ...prev,
        isEnabled: true,
        serviceType,
        error: undefined,
      }));

      console.log('✅ Official Akool LLM Service initialized successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Failed to initialize Official Akool LLM Service:', errorMessage);
      setState(prev => ({
        ...prev,
        isEnabled: false,
        error: errorMessage,
      }));
      return false;
    }
  }, []);

  /**
   * Set the RTC client
   */
  const setClient = useCallback((client: RTCClient) => {
    clientRef.current = client;
    if (llmServiceRef.current) {
      llmServiceRef.current.setClient(client);
    }
  }, []);

  /**
   * Send message using official Akool pattern
   */
  const sendMessageWithOfficialLLM = useCallback(async (
    question: string,
    userId?: string,
    sessionId?: string
  ) => {
    console.log('🚀 sendMessageWithOfficialLLM called:', { question, userId, sessionId });

    if (!llmServiceRef.current || !clientRef.current) {
      const error = 'Official LLM service not properly initialized';
      console.error('❌', error);
      throw new Error(error);
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

      // Use the official Akool pattern
      await llmServiceRef.current.sendMessageToAvatarWithLLM(question);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResponse: question, // Store the question as we sent the LLM response
        error: undefined,
      }));

      console.log('✅ Message sent using official Akool LLM pattern');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error in official LLM message sending:', errorMessage);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);

  /**
   * Disable the service
   */
  const disableService = useCallback(() => {
    llmServiceRef.current = null;
    clientRef.current = null;
    setState({
      isEnabled: false,
      isProcessing: false,
      error: undefined,
      lastResponse: undefined,
      serviceType: null,
    });
    console.log('🔌 Official Akool LLM Service disabled');
  }, []);

  /**
   * Test the service
   */
  const testService = useCallback(async () => {
    if (!llmServiceRef.current) {
      throw new Error('Service not initialized');
    }

    try {
      const testQuestion = 'Hello, this is a test message.';
      await sendMessageWithOfficialLLM(testQuestion);
      console.log('✅ Official Akool LLM Service test completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Official Akool LLM Service test failed:', error);
      return false;
    }
  }, [sendMessageWithOfficialLLM]);

  return {
    // State
    state,
    
    // Actions
    initializeService,
    setClient,
    sendMessageWithOfficialLLM,
    disableService,
    testService,
    
    // Computed
    isReady: state.isEnabled && !!llmServiceRef.current && !!clientRef.current,
  };
};

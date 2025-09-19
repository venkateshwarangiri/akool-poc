import { useState, useCallback, useRef, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { LLMService, LLMConfig } from '../services/llmService';
import { EnterpriseRAGService, RAGResponse, RAGConfig } from '../services/enterpriseRAGService';
const enterpriseRAGService = new EnterpriseRAGService();
export interface EnterpriseRAGState {
  isEnabled: boolean;
  isProcessing: boolean;
  lastResponse?: RAGResponse;
  error?: string;
  config: RAGConfig;
  documentCount: number;
  totalChunks: number;
}

export interface UseEnterpriseRAGReturn {
  state: EnterpriseRAGState;
  enableRAG: (llmConfig: LLMConfig, ragConfig?: Partial<RAGConfig>) => Promise<void>;
  disableRAG: () => void;
  updateConfig: (config: Partial<RAGConfig>) => void;
  sendMessageWithRAG: (client: RTCClient, question: string, userId?: string, sessionId?: string, onChatMessage?: (messageId: string, text: string, sender: 'user' | 'bot') => void) => Promise<void>;
  testRAG: () => Promise<boolean>;
  clearError: () => void;
  getStats: () => any;
  autoEnableRAGIfReady: () => void;
  forceEnableRAG: () => void;
  reconnectLLMService: () => void;
  resetRAGState: () => void;
  testRAGResponse: (question: string) => Promise<void>;
}

export function useEnterpriseRAG(): UseEnterpriseRAGReturn {
  const [state, setState] = useState<EnterpriseRAGState>(() => {
    // Load state from localStorage on initialization
    const savedState = localStorage.getItem('enterpriseRAGState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        
        // Validate the saved state - check if we actually have documents and LLM service
        const currentStats = enterpriseRAGService.getStats();
        const hasDocuments = currentStats.documentCount > 0;
        const hasLLMService = enterpriseRAGService.getLLMService() !== null;
        
        // Only restore enabled state if we have both documents and LLM service
        const shouldBeEnabled = parsed.isEnabled && hasDocuments && hasLLMService;
        
        console.log('🔍 State validation on load:', {
          savedEnabled: parsed.isEnabled,
          hasDocuments,
          hasLLMService,
          shouldBeEnabled,
          currentDocumentCount: currentStats.documentCount
        });
        
        return {
          isEnabled: shouldBeEnabled,
          isProcessing: false, // Always start with not processing
          config: parsed.config || enterpriseRAGService.getConfig(),
          documentCount: currentStats.documentCount, // Use current stats, not saved
          totalChunks: currentStats.totalChunks, // Use current stats, not saved
        };
      } catch (error) {
        console.warn('Failed to parse saved RAG state:', error);
      }
    }
    
    return {
      isEnabled: false,
      isProcessing: false,
      config: enterpriseRAGService.getConfig(),
      documentCount: 0,
      totalChunks: 0,
    };
  });

  const llmServiceRef = useRef<LLMService | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Save state to localStorage
  const saveStateToStorage = useCallback((newState: EnterpriseRAGState) => {
    try {
      localStorage.setItem('enterpriseRAGState', JSON.stringify({
        isEnabled: newState.isEnabled,
        config: newState.config,
        documentCount: newState.documentCount,
        totalChunks: newState.totalChunks,
      }));
    } catch (error) {
      console.warn('Failed to save RAG state to localStorage:', error);
    }
  }, []);

  // Initialize RAG service when enabled
  const enableRAG = useCallback(async (llmConfig: LLMConfig, ragConfig: Partial<RAGConfig> = {}) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
      
      // Create and configure LLM service
      const llmService = new LLMService(llmConfig);
      const isConnected = await llmService.testConnection();
      
      if (!isConnected) {
        throw new Error('Failed to connect to LLM service');
      }
      
      // Configure RAG service
      enterpriseRAGService.setLLMService(llmService);
      enterpriseRAGService.updateConfig(ragConfig);
      
      llmServiceRef.current = llmService;
      
      // Update state
      const stats = enterpriseRAGService.getStats();
      setState(prevState => {
        const newState = {
          ...prevState,
          isEnabled: true,
          isProcessing: false,
          config: enterpriseRAGService.getConfig(),
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
          error: undefined,
        };
        saveStateToStorage(newState);
        return newState;
      });
      
      console.log('Enterprise RAG service enabled successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isEnabled: false,
        isProcessing: false,
        error: errorMessage,
      }));
      console.error('Failed to enable Enterprise RAG service:', error);
    }
  }, []);

  // Disable RAG service
  const disableRAG = useCallback(() => {
    llmServiceRef.current = null;
    enterpriseRAGService.setLLMService(null as any);
    conversationHistoryRef.current = [];
    setState(prevState => {
      const newState = {
        ...prevState,
        isEnabled: false,
        isProcessing: false,
        lastResponse: undefined,
        error: undefined,
      };
      saveStateToStorage(newState);
      return newState;
    });
    console.log('Enterprise RAG service disabled');
  }, [saveStateToStorage]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<RAGConfig>) => {
    enterpriseRAGService.updateConfig(newConfig);
    setState(prev => ({
      ...prev,
      config: enterpriseRAGService.getConfig(),
    }));
  }, []);

  // Test RAG system
  const testRAG = useCallback(async (): Promise<boolean> => {
    if (!llmServiceRef.current || !state.isEnabled) {
      return false;
    }
    
    try {
      // Test with a simple query
      const testResponse = await enterpriseRAGService.generateRAGResponse(
        'What is this system?',
        'test-user',
        'test-session'
      );
      
      return testResponse !== null;
    } catch (error) {
      console.error('RAG system test failed:', error);
      return false;
    }
  }, [state.isEnabled]);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: undefined }));
  }, []);

  // Get current stats
  const getStats = useCallback(() => {
    return enterpriseRAGService.getStats();
  }, []);

  // Auto-enable RAG when documents are uploaded (if LLM is configured)
  const autoEnableRAGIfReady = useCallback(() => {
    const stats = enterpriseRAGService.getStats();
    // Check if we have documents and LLM service is available (either in ref or in enterprise service)
    const hasLLMService = llmServiceRef.current || enterpriseRAGService.getLLMService();
    
    setState(prevState => {
      console.log('🔍 Auto-enable check:', {
        documentCount: stats.documentCount,
        isEnabled: prevState.isEnabled,
        hasLLMService: !!hasLLMService,
        llmServiceRef: !!llmServiceRef.current,
        enterpriseLLMService: !!enterpriseRAGService.getLLMService(),
        shouldAutoEnable: stats.documentCount > 0 && !prevState.isEnabled && hasLLMService
      });
      
      if (stats.documentCount > 0 && !prevState.isEnabled && hasLLMService) {
        console.log('Auto-enabling RAG system after document upload');
        console.log('Stats:', stats);
        console.log('LLM Service available:', !!hasLLMService);
        
        const newState = {
          ...prevState,
          isEnabled: true,
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
        };
        saveStateToStorage(newState);
        return newState;
      } else if (stats.documentCount > 0 && prevState.isEnabled && hasLLMService) {
        // RAG is already enabled and working - no need to log
        console.log('✅ RAG system is properly enabled and connected');
        return prevState;
      } else {
        console.log('Auto-enable conditions not met:', {
          documentCount: stats.documentCount,
          isEnabled: prevState.isEnabled,
          hasLLMService: !!hasLLMService,
          llmServiceRef: !!llmServiceRef.current,
          enterpriseLLMService: !!enterpriseRAGService.getLLMService()
        });
        return prevState;
      }
    });
  }, [saveStateToStorage]);

  // Force enable RAG (for manual triggering)
  const forceEnableRAG = useCallback(() => {
    const stats = enterpriseRAGService.getStats();
    if (stats.documentCount > 0) {
      console.log('Force enabling RAG system');
      setState(prevState => {
        const newState = {
          ...prevState,
          isEnabled: true,
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
        };
        saveStateToStorage(newState);
        return newState;
      });
    }
  }, [saveStateToStorage]);

  // Reconnect LLM service to enterprise RAG service
  const reconnectLLMService = useCallback(() => {
    console.log('🔧 Attempting to reconnect LLM service to enterprise RAG service');
    
    // Try to get LLM service from saved config
    const savedLLMConfig = localStorage.getItem('llmIntegrationState');
    if (savedLLMConfig) {
      try {
        const parsed = JSON.parse(savedLLMConfig);
        if (parsed.config && parsed.config.endpoint && parsed.config.apiKey) {
          console.log('Found saved LLM config, creating new LLM service...');
          const llmService = new LLMService(parsed.config);
          enterpriseRAGService.setLLMService(llmService);
          llmServiceRef.current = llmService;
          console.log('✅ LLM service reconnected to enterprise RAG service');
        }
      } catch (error) {
        console.warn('Failed to parse saved LLM config:', error);
      }
    } else {
      console.log('No saved LLM config found');
    }
  }, []);

  // Reset RAG state completely
  const resetRAGState = useCallback(() => {
    console.log('🔄 Resetting RAG state completely');
    
    // Clear localStorage
    localStorage.removeItem('enterpriseRAGState');
    
    // Reset service state
    llmServiceRef.current = null;
    enterpriseRAGService.setLLMService(null as any);
    conversationHistoryRef.current = [];
    
    // Reset component state
    const newState = {
      isEnabled: false,
      isProcessing: false,
      config: enterpriseRAGService.getConfig(),
      documentCount: 0,
      totalChunks: 0,
      error: undefined,
      lastResponse: undefined,
    };
    
    setState(newState);
    console.log('✅ RAG state reset complete');
  }, []);

  // Test RAG response generation (without sending to avatar)
  const testRAGResponse = useCallback(async (question: string) => {
    console.log('🧪 Testing RAG response generation for:', question);
    
    if (!llmServiceRef.current || !state.isEnabled) {
      console.error('❌ RAG service not enabled for testing');
      return;
    }
    
    try {
      const ragResponse = await enterpriseRAGService.generateRAGResponse(
        question,
        'test-user',
        'test-session'
      );
      
      console.log('🧪 RAG test response:', {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sourcesCount: ragResponse.sources.length,
        sources: ragResponse.sources.map(s => ({
          document: s.document.name,
          similarity: s.similarity
        }))
      });
    } catch (error) {
      console.error('🧪 RAG test failed:', error);
    }
  }, [state.isEnabled]);

  // Clean RAG response by removing source citations
  const cleanRAGResponse = useCallback((response: string): string => {
    // Remove source citations like "(Source 1 from "FAQ .docx" (Unknown Department))"
    let cleaned = response.replace(/\(Source \d+ from "[^"]*" \([^)]*\)\)/g, '');
    
    // Remove any remaining source references
    cleaned = cleaned.replace(/\(Source \d+\)/g, '');
    
    // Clean up extra whitespace and periods
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    
    return cleaned;
  }, []);

  // Send message with RAG processing
  const sendMessageWithRAG = useCallback(async (
    client: RTCClient,
    question: string,
    userId?: string,
    sessionId?: string,
    onChatMessage?: (messageId: string, text: string, sender: 'user' | 'bot') => void
  ) => {
    console.log('🚀 sendMessageWithRAG called with:', { question, userId, sessionId });
    console.log('🚀 RAG service state:', { 
      hasLLMService: !!llmServiceRef.current, 
      isEnabled: state.isEnabled,
      enterpriseLLMService: !!enterpriseRAGService.getLLMService()
    });
    
    if (!llmServiceRef.current || !state.isEnabled) {
      console.error('❌ RAG service not properly enabled:', {
        hasLLMService: !!llmServiceRef.current,
        isEnabled: state.isEnabled
      });
      throw new Error('Enterprise RAG service is not enabled');
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

      // Add user message to conversation history
      conversationHistoryRef.current.push({ role: 'user', content: question });
      
      // Add user message to chat interface if callback provided
      if (onChatMessage) {
        const userMessageId = `user_${Date.now()}`;
        onChatMessage(userMessageId, question, 'user');
      }

      // Generate RAG response
      console.log('🔍 Generating RAG response for question:', question);
      const ragResponse = await enterpriseRAGService.generateRAGResponse(
        question,
        userId,
        sessionId
      );
      console.log('🔍 RAG response generated:', {
        answer: ragResponse.answer,
        confidence: ragResponse.confidence,
        sourcesCount: ragResponse.sources.length,
        sources: ragResponse.sources.map(s => ({
          document: s.document.name,
          similarity: s.similarity
        }))
      });

      // Clean the response to remove source citations
      const cleanedAnswer = cleanRAGResponse(ragResponse.answer);
      console.log('🧹 Cleaned RAG response:', {
        original: ragResponse.answer.substring(0, 100) + '...',
        cleaned: cleanedAnswer.substring(0, 100) + '...'
      });

      // Add assistant response to conversation history (use original for history)
      conversationHistoryRef.current.push({ role: 'assistant', content: ragResponse.answer });

      // Use the proper chunked message sending from agoraHelper
      const messageId = `msg-${Date.now()}`;
      console.log(`📤 Sending RAG response to avatar (${cleanedAnswer.length} chars)`);
      
      // Import the chunked message sending function
      const { sendMessageToAvatar } = await import('../agoraHelper');
      await sendMessageToAvatar(client, messageId, cleanedAnswer);
      console.log('✅ Cleaned RAG response sent to avatar');
      console.log('📤 RAG response details:', {
        textLength: cleanedAnswer.length,
        textPreview: cleanedAnswer.substring(0, 200) + '...',
        messageId: messageId
      });
      
      // Add bot response to chat interface if callback provided
      if (onChatMessage) {
        const botMessageId = `bot_${Date.now()}`;
        onChatMessage(botMessageId, cleanedAnswer, 'bot');
      }

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResponse: ragResponse,
        error: undefined,
      }));

      console.log('RAG response generated:', {
        question: question,
        answer: cleanedAnswer.substring(0, 100) + '...',
        confidence: ragResponse.confidence,
        sources: ragResponse.sources.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      
      console.error('Error in Enterprise RAG message sending:', error);
      throw error;
    }
  }, [state.isEnabled, cleanRAGResponse]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      const stats = enterpriseRAGService.getStats();
      setState(prevState => {
        const newState = {
          ...prevState,
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
        };
        saveStateToStorage(newState);
        return newState;
      });
    };

    // Update stats immediately
    updateStats();

    // Update stats every 10 seconds (reduced frequency to reduce noise)
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, []); // No dependencies to avoid loops

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      llmServiceRef.current = null;
      conversationHistoryRef.current = [];
    };
  }, []);

  return {
    state,
    enableRAG,
    disableRAG,
    updateConfig,
    sendMessageWithRAG,
    testRAG,
    clearError,
    getStats,
    autoEnableRAGIfReady,
    forceEnableRAG,
    reconnectLLMService,
    resetRAGState,
    testRAGResponse,
  };
}

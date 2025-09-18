import { useState, useCallback, useRef, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { LLMService, LLMConfig } from '../services/llmService';
import { chromaRAGService, ChromaRAGResponse, ChromaRAGConfig } from '../services/chromaRAGService';

export interface ChromaRAGState {
  isEnabled: boolean;
  isProcessing: boolean;
  lastResponse?: ChromaRAGResponse;
  error?: string;
  config: ChromaRAGConfig;
  documentCount: number;
  totalChunks: number;
  chromaConnected: boolean;
}

export interface UseChromaRAGReturn {
  state: ChromaRAGState;
  enableRAG: (llmConfig: LLMConfig, ragConfig?: Partial<ChromaRAGConfig>) => Promise<void>;
  disableRAG: () => void;
  updateConfig: (config: Partial<ChromaRAGConfig>) => void;
  sendMessageWithRAG: (client: RTCClient, question: string, userId?: string, sessionId?: string) => Promise<void>;
  testRAG: () => Promise<boolean>;
  testChromaConnection: () => Promise<boolean>;
  clearError: () => void;
  getStats: () => any;
  addDocument: (file: File, metadata?: any) => Promise<any>;
  removeDocument: (id: string) => Promise<boolean>;
  getDocuments: () => any[];
}

export function useChromaRAG(): UseChromaRAGReturn {
  const [state, setState] = useState<ChromaRAGState>({
    isEnabled: false,
    isProcessing: false,
    config: chromaRAGService.getConfig(),
    documentCount: 0,
    totalChunks: 0,
    chromaConnected: false,
  });

  const llmServiceRef = useRef<LLMService | null>(null);
  const conversationHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Initialize Chroma RAG service when enabled
  const enableRAG = useCallback(async (llmConfig: LLMConfig, ragConfig: Partial<ChromaRAGConfig> = {}) => {
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
      
      // Test Chroma connection first
      console.log('🔗 Testing Chroma Cloud connection...');
      const chromaConnected = await chromaRAGService.testConnection();
      if (!chromaConnected) {
        throw new Error('Failed to connect to Chroma Cloud. Check your API key and configuration.');
      }
      console.log('✅ Chroma Cloud connected successfully');
      
      // Create and configure LLM service
      const llmService = new LLMService(llmConfig);
      const isConnected = await llmService.testConnection();
      
      if (!isConnected) {
        throw new Error('Failed to connect to LLM service');
      }
      
      // Configure Chroma RAG service
      chromaRAGService.setLLMService(llmService);
      chromaRAGService.updateConfig(ragConfig);
      
      llmServiceRef.current = llmService;
      
      // Update state
      const stats = chromaRAGService.getStats();
      setState(prev => ({
        ...prev,
        isEnabled: true,
        isProcessing: false,
        config: chromaRAGService.getConfig(),
        documentCount: stats.documentCount,
        totalChunks: stats.totalChunks,
        chromaConnected: true,
        error: undefined,
      }));
      
      console.log('🚀 Chroma RAG service enabled successfully');
      console.log('📊 Stats:', stats);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isEnabled: false,
        isProcessing: false,
        chromaConnected: false,
        error: errorMessage,
      }));
      console.error('❌ Failed to enable Chroma RAG service:', error);
    }
  }, []);

  // Disable RAG service
  const disableRAG = useCallback(() => {
    llmServiceRef.current = null;
    chromaRAGService.setLLMService(null as any);
    conversationHistoryRef.current = [];
    setState(prev => ({
      ...prev,
      isEnabled: false,
      isProcessing: false,
      lastResponse: undefined,
      error: undefined,
      chromaConnected: false,
    }));
    console.log('🔌 Chroma RAG service disabled');
  }, []);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<ChromaRAGConfig>) => {
    chromaRAGService.updateConfig(newConfig);
    setState(prev => ({
      ...prev,
      config: chromaRAGService.getConfig(),
    }));
  }, []);

  // Test Chroma connection
  const testChromaConnection = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await chromaRAGService.testConnection();
      setState(prev => ({ ...prev, chromaConnected: connected }));
      return connected;
    } catch (error) {
      console.error('Chroma connection test failed:', error);
      setState(prev => ({ ...prev, chromaConnected: false }));
      return false;
    }
  }, []);

  // Test RAG system
  const testRAG = useCallback(async (): Promise<boolean> => {
    if (!llmServiceRef.current || !state.isEnabled) {
      return false;
    }
    
    try {
      // Test with a simple query
      const testResponse = await chromaRAGService.generateRAGResponse(
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
    return chromaRAGService.getStats();
  }, []);

  // Add document
  const addDocument = useCallback(async (file: File, metadata: any = {}) => {
    if (!state.isEnabled) {
      throw new Error('Chroma RAG service is not enabled');
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));
      
      const document = await chromaRAGService.addDocument(file, metadata);
      
      // Update stats
      const stats = chromaRAGService.getStats();
      setState(prev => ({
        ...prev,
        isProcessing: false,
        documentCount: stats.documentCount,
        totalChunks: stats.totalChunks,
        error: undefined,
      }));
      
      console.log('📄 Document added successfully:', document.name);
      return document;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [state.isEnabled]);

  // Remove document
  const removeDocument = useCallback(async (id: string) => {
    if (!state.isEnabled) {
      throw new Error('Chroma RAG service is not enabled');
    }

    try {
      const success = await chromaRAGService.removeDocument(id);
      
      if (success) {
        // Update stats
        const stats = chromaRAGService.getStats();
        setState(prev => ({
          ...prev,
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
        }));
        
        console.log('🗑️ Document removed successfully:', id);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to remove document:', error);
      throw error;
    }
  }, [state.isEnabled]);

  // Get documents
  const getDocuments = useCallback(() => {
    return chromaRAGService.getDocuments();
  }, []);

  // Send message with RAG processing
  const sendMessageWithRAG = useCallback(async (
    client: RTCClient,
    question: string,
    userId?: string,
    sessionId?: string
  ) => {
    if (!llmServiceRef.current || !state.isEnabled) {
      throw new Error('Chroma RAG service is not enabled');
    }

    try {
      setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

      // Add user message to conversation history
      conversationHistoryRef.current.push({ role: 'user', content: question });

      // Generate RAG response using Chroma
      const ragResponse = await chromaRAGService.generateRAGResponse(
        question,
        userId,
        sessionId
      );

      // Add assistant response to conversation history
      conversationHistoryRef.current.push({ role: 'assistant', content: ragResponse.answer });

      // Use chunked message sending for large RAG responses
      const messageId = `msg-${Date.now()}`;
      console.log('📤 Sending ChromaRAG response to avatar:', {
        textLength: ragResponse.answer.length,
        textPreview: ragResponse.answer.substring(0, 100) + '...',
        confidence: ragResponse.confidence,
        sourcesCount: ragResponse.sources.length
      });

      // Send the processed message to the avatar using chunked sending
      const { sendMessageToAvatar } = await import('../agoraHelper');
      await sendMessageToAvatar(client, messageId, ragResponse.answer);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResponse: ragResponse,
        error: undefined,
      }));

      console.log('🚀 Message sent to avatar with Chroma RAG processing:', {
        originalQuestion: question,
        ragResponse: ragResponse.answer,
        confidence: ragResponse.confidence,
        sources: ragResponse.sources.length,
        searchTime: ragResponse.metadata.searchTime,
        processingTime: ragResponse.metadata.processingTime,
        responseQuality: ragResponse.analytics.responseQuality,
        metadata: ragResponse.metadata,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      
      console.error('❌ Error in Chroma RAG message sending:', error);
      throw error;
    }
  }, [state.isEnabled]);

  // Update stats periodically
  useEffect(() => {
    if (state.isEnabled) {
      const updateStats = () => {
        const stats = chromaRAGService.getStats();
        setState(prev => ({
          ...prev,
          documentCount: stats.documentCount,
          totalChunks: stats.totalChunks,
        }));
      };

      // Update stats immediately
      updateStats();

      // Update stats every 30 seconds
      const interval = setInterval(updateStats, 30000);
      return () => clearInterval(interval);
    }
  }, [state.isEnabled]);

  // Test Chroma connection on mount
  useEffect(() => {
    testChromaConnection();
  }, [testChromaConnection]);

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
    testChromaConnection,
    clearError,
    getStats,
    addDocument,
    removeDocument,
    getDocuments,
  };
}

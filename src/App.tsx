import { useState, useEffect, useRef } from 'react';
import './App.css';
import { ApiService } from './apiService';

import ConfigurationPanel from './components/ConfigurationPanel';
import NetworkQualityDisplay from './components/NetworkQuality';
import VideoDisplay from './components/VideoDisplay';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import LLMConfigPanel from './components/LLMConfigPanel';
// import AzureOpenAIConfig from './components/AzureOpenAIConfig';
import EnterpriseDocumentManager from './components/EnterpriseDocumentManager';
import ConfigStatus from './components/ConfigStatus';
import { useAgora } from './contexts/AgoraContext';
import { useAudioControls } from './hooks/useAudioControls';
import { useStreaming } from './hooks/useStreaming';
import { useVideoCamera } from './hooks/useVideoCamera';
import { useEnterpriseRAG } from './hooks/useEnterpriseRAG';
// import { useOfficialAkoolLLM } from './hooks/useOfficialAkoolLLM';
// import { OfficialAkoolLLMTest } from './components/OfficialAkoolLLMTest';

function App() {
  const { client } = useAgora();
  const { micEnabled, setMicEnabled, toggleMic, cleanup: cleanupAudio } = useAudioControls();

  const [modeType, setModeType] = useState(Number(import.meta.env.VITE_MODE_TYPE) || 1); // Changed default to Mode 1 (Repeat) for RAG compatibility
  const [language, setLanguage] = useState(import.meta.env.VITE_LANGUAGE || 'en');
  const [voiceId, setVoiceId] = useState(import.meta.env.VITE_VOICE_ID || '');
  const [backgroundUrl, setBackgroundUrl] = useState(import.meta.env.VITE_BACKGROUND_URL || '');
  const [voiceUrl, setVoiceUrl] = useState(import.meta.env.VITE_VOICE_URL || '');
  const [voiceParams, setVoiceParams] = useState<Record<string, unknown>>({});

  const [openapiHost, setOpenapiHost] = useState(import.meta.env.VITE_OPENAPI_HOST || '');
  const [avatarId, setAvatarId] = useState(import.meta.env.VITE_AVATAR_ID || '');
  const [knowledgeId, setKnowledgeId] = useState('');
  const [avatarVideoUrl, setAvatarVideoUrl] = useState(import.meta.env.VITE_AVATAR_VIDEO_URL || '');

  const [openapiToken, setOpenapiToken] = useState(import.meta.env.VITE_OPENAPI_TOKEN || '');
  const [sessionDuration, setSessionDuration] = useState(10);
  const [api, setApi] = useState<ApiService | null>(null);
  const [currentView, setCurrentView] = useState<'main' | 'admin' | 'rag'>('main');
  const [llmConfig, setLlmConfig] = useState<any>(null);
  // const [ragConfig, setRagConfig] = useState<any>(null);

  // Ref to store the system message callback
  const systemMessageCallbackRef = useRef<
    ((messageId: string, text: string, systemType: string, metadata?: Record<string, unknown>) => void) | null
  >(null);

  useEffect(() => {
    if (openapiHost && openapiToken) {
      setApi(new ApiService(openapiHost, openapiToken));
    }
  }, [openapiHost, openapiToken]);

  const { cameraEnabled, localVideoTrack, cameraError, toggleCamera, cleanup: cleanupCamera } = useVideoCamera();
  
  // Enterprise RAG integration
  const { state: ragState, enableRAG, sendMessageWithRAG, autoEnableRAGIfReady, forceEnableRAG, reconnectLLMService, resetRAGState, testRAGResponse } = useEnterpriseRAG();
  
  // Official Akool LLM integration (disabled for production)
  // const { setClient: setOfficialClient } = useOfficialAkoolLLM();

  // Connect LLM config to enterprise RAG service
  useEffect(() => {
    if (llmConfig && llmConfig.endpoint && llmConfig.apiKey && !ragState.isEnabled) {
      console.log('LLM config updated, connecting to enterprise RAG service');
      enableRAG(llmConfig);
    }
  }, [llmConfig, ragState.isEnabled]);

  // Connect RTC client to official Akool LLM service (disabled for production)
  // useEffect(() => {
  //   if (client) {
  //     setOfficialClient(client);
  //   }
  // }, [client, setOfficialClient]);

  // Chat message callback for RAG responses
  const chatMessageCallbackRef = useRef<((messageId: string, text: string, sender: 'user' | 'bot') => void) | null>(null);

  const { isJoined, connected, remoteStats, startStreaming, closeStreaming } = useStreaming(
    avatarId,
    knowledgeId,
    sessionDuration,
    voiceId,
    voiceUrl,
    backgroundUrl,
    language,
    modeType,
    voiceParams,
    api,
    localVideoTrack,
    systemMessageCallbackRef.current || undefined,
    ragState,
    sendMessageWithRAG,
    chatMessageCallbackRef.current || undefined,
  );

  // Auto-cleanup media devices when streaming stops
  useEffect(() => {
    if (!connected) {
      // Cleanup both audio and video when streaming stops
      if (micEnabled) {
        cleanupAudio();
      }
      if (cameraEnabled) {
        cleanupCamera();
      }
    }
  }, [connected, micEnabled, cameraEnabled, cleanupAudio, cleanupCamera]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupAudio();
      cleanupCamera();
    };
  }, [cleanupAudio, cleanupCamera]);

  return (
    <>
      <ConfigStatus />
      <div className="app-header">
        <div className="nav-buttons">
          <button 
            className={`nav-button ${currentView === 'main' ? 'active' : ''}`}
            onClick={() => setCurrentView('main')}
          >
            Streaming Avatar
          </button>
          <button 
            className={`nav-button ${currentView === 'rag' ? 'active' : ''}`}
            onClick={() => setCurrentView('rag')}
          >
            Enterprise RAG
          </button>
          <button 
            className={`nav-button ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => setCurrentView('admin')}
          >
            Knowledge Base Admin
          </button>
        </div>
      </div>
      
      {currentView === 'main' ? (
        <div className="app-container">
          <div className="left-panel">
            <ConfigurationPanel
              openapiHost={openapiHost}
              setOpenapiHost={setOpenapiHost}
              openapiToken={openapiToken}
              setOpenapiToken={setOpenapiToken}
              sessionDuration={sessionDuration}
              setSessionDuration={setSessionDuration}
              modeType={modeType}
              setModeType={setModeType}
              avatarId={avatarId}
              setAvatarId={setAvatarId}
              voiceId={voiceId}
              setVoiceId={setVoiceId}
              language={language}
              setLanguage={setLanguage}
              backgroundUrl={backgroundUrl}
              setBackgroundUrl={setBackgroundUrl}
              voiceUrl={voiceUrl}
              setVoiceUrl={setVoiceUrl}
              knowledgeId={knowledgeId}
              setKnowledgeId={setKnowledgeId}
              voiceParams={voiceParams}
              setVoiceParams={setVoiceParams}
              isJoined={isJoined}
              startStreaming={startStreaming}
              closeStreaming={closeStreaming}
              api={api}
              setAvatarVideoUrl={setAvatarVideoUrl}
            />
            <LLMConfigPanel onConfigChange={setLlmConfig} />
          </div>
          <div className="right-side">
            <VideoDisplay
              isJoined={isJoined}
              avatarVideoUrl={avatarVideoUrl}
              localVideoTrack={localVideoTrack}
              cameraEnabled={cameraEnabled}
            />
            <ChatInterface
              client={client}
              connected={connected}
              micEnabled={micEnabled}
              setMicEnabled={setMicEnabled}
              toggleMic={toggleMic}
              cameraEnabled={cameraEnabled}
              toggleCamera={toggleCamera}
              cameraError={cameraError}
              llmConfig={llmConfig}
              ragState={ragState}
              sendMessageWithRAG={sendMessageWithRAG}
              onSystemMessageCallback={(callback) => {
                systemMessageCallbackRef.current = callback;
              }}
              onChatMessageCallback={(callback) => {
                chatMessageCallbackRef.current = callback;
              }}
            />
            <div>{isJoined && remoteStats && <NetworkQualityDisplay stats={remoteStats} />}</div>
          </div>
        </div>
      ) : currentView === 'rag' ? (
        <div className="app-container">
          <div className="left-panel">
            <LLMConfigPanel onConfigChange={setLlmConfig} />
            <EnterpriseDocumentManager 
              onDocumentChange={(docs) => {
                // Update RAG state when documents change
                console.log('Documents updated:', docs.length);
              }}
              onConfigChange={() => {}}
              onDocumentUploaded={() => {
                // Auto-enable RAG when documents are uploaded
                console.log('Document uploaded, checking if RAG should be auto-enabled');
                autoEnableRAGIfReady();
                
                // Also try force enable as fallback
                setTimeout(() => {
                  if (!ragState.isEnabled) {
                    console.log('Auto-enable failed, trying force enable');
                    forceEnableRAG();
                  }
                }, 1000);
              }}
            />
          </div>
          <div className="right-side">
            <div className="rag-status-panel">
              <h3>Enterprise RAG Status</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">RAG System:</span>
                  <span className={`status-value ${ragState.isEnabled ? 'enabled' : 'disabled'}`}>
                    {ragState.isEnabled ? '🟢 Enabled' : '🔴 Disabled'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Documents:</span>
                  <span className="status-value">{ragState.documentCount}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Chunks:</span>
                  <span className="status-value">{ragState.totalChunks}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Processing:</span>
                  <span className="status-value">
                    {ragState.isProcessing ? '⏳ Yes' : '✅ No'}
                  </span>
                </div>
              </div>
              
              {!ragState.isEnabled && ragState.documentCount > 0 && (
                <div className="rag-manual-controls">
                  <button 
                    onClick={() => {
                      console.log('Manual RAG enable triggered');
                      if (llmConfig) {
                        enableRAG(llmConfig);
                      } else {
                        forceEnableRAG();
                      }
                    }}
                    className="enable-rag-button"
                  >
                    Enable RAG System
                  </button>
                  <p className="help-text">
                    RAG system has documents but is not enabled. Click to enable.
                  </p>
                </div>
              )}
              
              {ragState.isEnabled && ragState.documentCount > 0 && (
                <div className="rag-manual-controls">
                  <button 
                    onClick={() => {
                      console.log('Manual LLM service reconnect triggered');
                      reconnectLLMService();
                    }}
                    className="reconnect-llm-button"
                  >
                    Reconnect LLM Service
                  </button>
                  <p className="help-text">
                    If RAG is enabled but not working, click to reconnect the LLM service.
                  </p>
                  
                  <div className="rag-mode-warning">
                    <p className="warning-text">
                      ⚠️ <strong>Important:</strong> For RAG responses to work, the avatar must be in <strong>Mode 1 (Repeat)</strong>. 
                      If the avatar is in Mode 2 (Dialogue), it will generate its own responses instead of using RAG responses.
                    </p>
                  </div>
                  
                  <button 
                    onClick={() => {
                      console.log('Testing RAG response generation...');
                      testRAGResponse('What is in the document?');
                    }}
                    className="test-rag-button"
                  >
                    Test RAG Response
                  </button>
                  <p className="help-text">
                    Click to test if RAG can generate responses from your documents (check console for results).
                  </p>
                </div>
              )}
              
              {(ragState.isEnabled && ragState.documentCount === 0) && (
                <div className="rag-manual-controls">
                  <button 
                    onClick={() => {
                      console.log('Reset RAG state triggered');
                      resetRAGState();
                    }}
                    className="reset-rag-button"
                  >
                    Reset RAG State
                  </button>
                  <p className="help-text">
                    RAG shows as enabled but has no documents. Click to reset the state.
                  </p>
                </div>
              )}
              
              {ragState.lastResponse && (
                <div className="last-rag-response">
                  <h4>Last RAG Response</h4>
                  <div className="response-details">
                    <p><strong>Confidence:</strong> {(ragState.lastResponse.confidence * 100).toFixed(1)}%</p>
                    <p><strong>Sources:</strong> {ragState.lastResponse.sources.length} documents</p>
                    <p><strong>Processing Time:</strong> {ragState.lastResponse.metadata.processingTime}ms</p>
                    <p><strong>Tokens Used:</strong> {ragState.lastResponse.metadata.tokensUsed}</p>
                  </div>
                </div>
              )}
              
              {ragState.error && (
                <div className="rag-error">
                  <h4>Error</h4>
                  <p>{ragState.error}</p>
                </div>
              )}

              {/* Official Akool LLM Test Component (disabled for production) */}
              {/* <div className="official-akool-test-section">
                <h3>🎯 Official Akool LLM Integration Test</h3>
                <OfficialAkoolLLMTest 
                  onMessageSent={(question) => {
                    console.log('Official Akool LLM message sent:', question);
                  }}
                />
              </div> */}
            </div>
          </div>
        </div>
      ) : (
        <AdminPanel api={api} />
      )}
    </>
  );
}

export default App;

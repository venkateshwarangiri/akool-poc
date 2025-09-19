import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RTCClient, interruptResponse } from '../../agoraHelper';
import {
  SystemEventType,
  UserTriggeredEventType,
  MessageSender,
  MessageType,
  Message,
} from '../../hooks/useMessageState';
import { useAgora } from '../../contexts/AgoraContext';
import { useLLMIntegration } from '../../hooks/useLLMIntegration';
import { LLMConfig } from '../../services/llmService';
import { EnterpriseRAGState } from '../../hooks/useEnterpriseRAG';
import './styles.css';

interface ChatInterfaceProps {
  client: RTCClient;
  connected: boolean;
  micEnabled: boolean;
  setMicEnabled: (enabled: boolean) => void;
  toggleMic?: () => Promise<void>;
  cameraEnabled: boolean;
  toggleCamera: () => Promise<void>;
  cameraError?: string | null;
  llmConfig?: LLMConfig | null;
  ragState?: EnterpriseRAGState;
  sendMessageWithRAG?: (client: RTCClient, question: string, userId?: string, sessionId?: string, onChatMessage?: (messageId: string, text: string, sender: 'user' | 'bot') => void) => Promise<void>;
  onSystemEvent?: (type: UserTriggeredEventType, message: string) => void;
  onSystemMessageCallback?: (
    callback: (messageId: string, text: string, systemType: string, metadata?: Record<string, unknown>) => void,
  ) => void;
  onChatMessageCallback?: (
    callback: (messageId: string, text: string, sender: 'user' | 'bot') => void,
  ) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  client,
  connected,
  micEnabled,
  setMicEnabled,
  toggleMic,
  cameraEnabled,
  toggleCamera,
  cameraError,
  llmConfig,
  ragState,
  sendMessageWithRAG,
  onSystemMessageCallback,
  onChatMessageCallback,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { setIsAvatarSpeaking } = useAgora();
  const [hasAvatarStartedSpeaking, setHasAvatarStartedSpeaking] = useState(false);
  
  // LLM Integration
  const { state: llmState, sendMessageToAvatarWithLLM } = useLLMIntegration();

  // Add state for resizable height
  const [chatHeight, setChatHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startHeight, setStartHeight] = useState(0);

  // Tooltip state
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Tooltip component
  const Tooltip = ({
    content,
    position,
    visible,
  }: {
    content: string;
    position: { x: number; y: number };
    visible: boolean;
  }) => {
    if (!visible || !content) return null;

    return (
      <div
        className="tooltip"
        style={{
          position: 'fixed',
          left: position.x + 10,
          top: position.y - 10,
          zIndex: 9999,
        }}
      >
        <div className="tooltip-content">
          <pre>{content}</pre>
        </div>
      </div>
    );
  };

  // Create our own message state management to avoid conflicts with useMessageState
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');

  // Helper functions for message management
  const addMessage = useCallback((id: string, text: string, sender: MessageSender, messageType: MessageType = MessageType.CHAT, systemType?: SystemEventType, metadata?: Record<string, unknown>) => {
    const newMessage: Message = {
      id,
      text,
      sender,
      messageType,
      timestamp: Date.now(),
      systemType,
      metadata,
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const addChatMessage = useCallback((id: string, text: string, sender: MessageSender) => {
    addMessage(id, text, sender, MessageType.CHAT);
  }, [addMessage]);

  const addSystemMessage = useCallback((id: string, text: string, systemType: SystemEventType, metadata?: Record<string, unknown>) => {
    addMessage(id, text, MessageSender.SYSTEM, MessageType.SYSTEM, systemType, metadata);
  }, [addMessage]);

  // Chat message callback for RAG responses
  const handleChatMessage = useCallback((messageId: string, text: string, sender: 'user' | 'bot') => {
    const messageSender = sender === 'user' ? MessageSender.USER : MessageSender.AVATAR;
    addMessage(messageId, text, messageSender, MessageType.CHAT);
  }, [addMessage]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const formatTime = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  }, []);

  const shouldShowTimeSeparator = useCallback((current: Message, previous?: Message) => {
    if (!previous) return false;
    const timeDiff = current.timestamp - previous.timestamp;
    return timeDiff > 5 * 60 * 1000; // 5 minutes
  }, []);

  // Enhanced sendMessage that uses LLM when available
  const sendMessageEnhanced = useCallback(async () => {
    console.log('🚀 sendMessageEnhanced called!', { inputMessage, connected });
    console.log('🚀 sendMessageEnhanced - RAG State:', ragState);
    console.log('🚀 sendMessageEnhanced - sendMessageWithRAG exists:', !!sendMessageWithRAG);
    if (!inputMessage.trim() || !connected) return;

    const messageId = Date.now().toString();
    const userMessage = inputMessage.trim();

    // Add user message to chat immediately
    addChatMessage(messageId, userMessage, MessageSender.USER);
    setInputMessage('');

    try {
      // Debug logging
      console.log('🔍 ChatInterface Debug:', {
        ragState: ragState,
        ragEnabled: ragState?.isEnabled,
        hasSendMessageWithRAG: !!sendMessageWithRAG,
        llmConfig: llmConfig,
        llmEnabled: llmState.isEnabled,
        message: userMessage
      });
      
      // Additional debug for RAG condition
      console.log('🔍 RAG Condition Check:', {
        'ragState exists': !!ragState,
        'ragState.isEnabled': ragState?.isEnabled,
        'ragState.documentCount': ragState?.documentCount,
        'sendMessageWithRAG exists': !!sendMessageWithRAG,
        'condition result': !!(ragState && ragState.isEnabled && sendMessageWithRAG)
      });
      
      // Log the full ragState object for debugging
      console.log('🔍 Full RAG State:', ragState);

      // If Enterprise RAG is enabled, use it
      if (ragState && ragState.isEnabled && sendMessageWithRAG) {
        console.log('🧠 Using Enterprise RAG for message processing');
        addSystemMessage(`rag_${messageId}`, '🧠 Processing with Enterprise RAG...', SystemEventType.SET_PARAMS);
        
        await sendMessageWithRAG(client, userMessage, 'user', `session_${Date.now()}`);
        
        addSystemMessage(`rag_done_${messageId}`, '✅ RAG processing complete', SystemEventType.SET_PARAMS_ACK);
      }
      // If LLM is enabled and configured, use it
      else if (llmConfig && llmState.isEnabled) {
        console.log('🤖 Using LLM for message processing');
        addSystemMessage(`llm_${messageId}`, '🤖 Processing with LLM...', SystemEventType.SET_PARAMS);
        
        await sendMessageToAvatarWithLLM(client, userMessage);
        
        addSystemMessage(`llm_done_${messageId}`, '✅ LLM processing complete', SystemEventType.SET_PARAMS_ACK);
      } else {
        console.log('📤 Using direct message sending (no RAG/LLM)');
        // Send message directly to avatar without RAG/LLM processing
        const message = {
          v: 2,
          type: "chat",
          mid: `msg-${Date.now()}`,
          idx: 0,
          fin: true,
          pld: {
            text: userMessage
          }
        };
        await client.sendStreamMessage(JSON.stringify(message), false);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      addSystemMessage(`error_${messageId}`, `❌ Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`, SystemEventType.INTERRUPT_ACK);
    }
  }, [inputMessage, connected, llmConfig, llmState.isEnabled, ragState, sendMessageWithRAG, client, addChatMessage, addSystemMessage, setInputMessage, sendMessageToAvatarWithLLM]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      console.log('Resize handle clicked!', e.clientY);
      e.preventDefault();
      setIsResizing(true);
      setStartY(e.clientY);
      setStartHeight(chatHeight);
    },
    [chatHeight],
  );

  // Handle mouse move for resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const deltaY = startY - e.clientY;
      const maxHeight = window.innerHeight - 40; // Leave some margin from top
      const newHeight = Math.max(200, Math.min(maxHeight, startHeight + deltaY));
      console.log('Resizing:', { deltaY, newHeight, maxHeight, startY: e.clientY });
      setChatHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startY, startHeight]);

  // Handle window resize to adjust max height
  useEffect(() => {
    const handleWindowResize = () => {
      const maxHeight = window.innerHeight - 40;
      if (chatHeight > maxHeight) {
        setChatHeight(maxHeight);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [chatHeight]);

  // Tooltip event handlers
  const handleMessageMouseEnter = useCallback((e: React.MouseEvent, message: Message) => {
    if (message.systemType === SystemEventType.SET_PARAMS && message.metadata?.fullParams) {
      console.log('Showing tooltip for set-params message:', message.metadata.fullParams);
      const paramsStr = JSON.stringify(message.metadata.fullParams, null, 2);
      setTooltipContent(paramsStr);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
      setShowTooltip(true);
    }
  }, []);

  const handleMessageMouseLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleStreamMessage = useCallback(
    (_: number, body: Uint8Array) => {
      try {
        const msg = new TextDecoder().decode(body);
        const { v, type, mid, pld } = JSON.parse(msg);
        if (v !== 2) {
          return;
        }

        if (type === 'chat') {
          const { text, from } = pld;
          const sender = from === 'user' ? MessageSender.USER : MessageSender.AVATAR;
          addChatMessage(`${type}_${mid}`, text, sender);
        } else if (type === 'event') {
          const { event } = pld;
          if (event === 'audio_start') {
            setIsAvatarSpeaking(true);
            setHasAvatarStartedSpeaking(true);
            console.log('Avatar started speaking - will now show "finished speaking" messages');
            addSystemMessage(`event_${mid}`, '🎤 Avatar started speaking', SystemEventType.AVATAR_AUDIO_START);
          } else if (event === 'audio_end') {
            setIsAvatarSpeaking(false);
            // Only show "Avatar finished speaking" message if:
            // 1. The avatar has actually started speaking in this session, AND
            // 2. There are actual chat messages in the conversation (not just system messages)
            const hasChatMessages = messages.some((msg) => msg.messageType === MessageType.CHAT);
            if (hasAvatarStartedSpeaking && hasChatMessages) {
              addSystemMessage(`event_${mid}`, '✅ Avatar finished speaking', SystemEventType.AVATAR_AUDIO_END);
            } else {
              console.log('Suppressing "Avatar finished speaking" message:', {
                hasAvatarStartedSpeaking,
                hasChatMessages,
                messageCount: messages.length,
                chatMessageCount: messages.filter((msg) => msg.messageType === MessageType.CHAT).length,
              });
            }
          }
          // Log any other events for debugging
          else {
            addMessage(`event_${mid}`, `📋 Event: ${event}`, MessageSender.SYSTEM, MessageType.EVENT);
          }
        } else if (type === 'command') {
          // Handle command acknowledgments
          const { cmd, code, msg } = pld;
          if (code !== undefined) {
            // This is a command acknowledgment
            const status = code === 1000 ? '✅' : '❌';
            const statusText = code === 1000 ? 'Success' : 'Failed';
            const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT_ACK : SystemEventType.SET_PARAMS_ACK;
            addSystemMessage(`cmd_ack_${mid}`, `${status} ${cmd}: ${statusText}${msg ? ` (${msg})` : ''}`, systemType);
          } else {
            // This is a command being sent
            const { data } = pld;
            const dataStr = data ? ` with data: ${JSON.stringify(data)}` : '';
            const systemType = cmd === 'interrupt' ? SystemEventType.INTERRUPT : SystemEventType.SET_PARAMS;
            const messageText = cmd === 'set-params' && data ? `📤 ${cmd}${dataStr} ℹ️` : `📤 ${cmd}${dataStr}`;

            const metadata = cmd === 'set-params' && data ? { fullParams: data } : undefined;
            console.log('Creating set-params message:', {
              cmd,
              data,
              metadata,
              messageText,
            });

            addSystemMessage(`cmd_send_${mid}`, messageText, systemType, metadata);
          }
        }
      } catch (error) {
        console.error('Error handling stream message:', error);
        console.error('Message body:', body);
      }
    },
    [setIsAvatarSpeaking, addChatMessage, addSystemMessage, addMessage, hasAvatarStartedSpeaking, messages],
  );

  // Set up stream message listener
  useEffect(() => {
    if (connected) {
      // Store the handler reference so we can remove only this specific listener
      const messageHandler = handleStreamMessage;
      client.on('stream-message', messageHandler);
      return () => {
        // Remove only this specific listener, not all listeners
        client.off('stream-message', messageHandler);
      };
    }
  }, [client, connected, handleStreamMessage]);

  // Reset avatar speaking state when connection is established
  useEffect(() => {
    if (connected) {
      setHasAvatarStartedSpeaking(false);
    }
  }, [connected]);

  // Set up system message callback
  useEffect(() => {
    if (onSystemMessageCallback) {
      onSystemMessageCallback((messageId, text, systemType, metadata) => {
        addSystemMessage(messageId, text, systemType as SystemEventType, metadata);
      });
    }
  }, [onSystemMessageCallback, addSystemMessage]);

  // Set up chat message callback for RAG responses
  useEffect(() => {
    if (onChatMessageCallback) {
      onChatMessageCallback(handleChatMessage);
    }
  }, [onChatMessageCallback, handleChatMessage]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add effect to clear messages when connection is lost
  useEffect(() => {
    if (!connected) {
      clearMessages();
      // Reset the avatar speaking state when connection is lost
      setHasAvatarStartedSpeaking(false);
    }
  }, [connected, clearMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleMicInternal = async () => {
    if (toggleMic) {
      await toggleMic();
      // Add system message for user audio state change
      if (micEnabled) {
        addSystemMessage(`mic_${Date.now()}`, '🔇 User microphone disabled', SystemEventType.MIC_END);
      } else {
        addSystemMessage(`mic_${Date.now()}`, '🎤 User microphone enabled', SystemEventType.MIC_START);
      }
      return;
    }

    // Fallback implementation if toggleMic is not provided
    if (!micEnabled) {
      setMicEnabled(true);
      addSystemMessage(`mic_${Date.now()}`, '🎤 User microphone enabled', SystemEventType.MIC_START);
    } else {
      setMicEnabled(false);
      addSystemMessage(`mic_${Date.now()}`, '🔇 User microphone disabled', SystemEventType.MIC_END);
    }
  };

  const toggleCameraInternal = async () => {
    if (!connected) return;

    try {
      // Add system message for video state change
      if (cameraEnabled) {
        addSystemMessage(`camera_${Date.now()}`, '📷 User camera disabled', SystemEventType.CAMERA_END);
      } else {
        addSystemMessage(`camera_${Date.now()}`, '📹 User camera enabled', SystemEventType.CAMERA_START);
      }

      // Toggle the camera
      await toggleCamera();
    } catch (error) {
      console.error('Failed to toggle camera:', error);
    }
  };

  return (
    <div className={`chat-window ${isResizing ? 'resizing' : ''}`} style={{ height: `${chatHeight}px` }}>
      <div
        className="resize-handle"
        onMouseDown={handleMouseDown}
        title={`Drag to resize chat window (current height: ${chatHeight}px)`}
      >
        <div className="resize-indicator"></div>
        <div className="resize-dots">
          <span>•</span>
          <span>•</span>
          <span>•</span>
        </div>
        <div className="resize-text">↕ Drag to resize</div>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => {
          const previousMessage = index > 0 ? messages[index - 1] : undefined;
          const showTimeSeparator = shouldShowTimeSeparator(message, previousMessage);
          const isFirstMessage = index === 0;

          return (
            <div key={message.id}>
              {(isFirstMessage || showTimeSeparator) && (
                <div className="time-separator">{formatTime(message.timestamp)}</div>
              )}
              <div
                className={`chat-message ${message.sender === MessageSender.USER ? 'sent' : 'received'} ${message.messageType === MessageType.SYSTEM ? `system ${message.systemType || ''}` : ''}`}
                onMouseEnter={(e) => handleMessageMouseEnter(e, message)}
                onMouseLeave={handleMessageMouseLeave}
              >
                {message.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <Tooltip content={tooltipContent} position={tooltipPosition} visible={showTooltip} />
      <div className="chat-input">
        <button
          onClick={toggleMicInternal}
          disabled={!connected}
          className={`icon-button ${!connected ? 'disabled' : ''}`}
          title={micEnabled ? 'Disable microphone' : 'Enable microphone'}
        >
          <span className="material-icons">{micEnabled ? 'mic' : 'mic_off'}</span>
        </button>
        <button
          onClick={toggleCameraInternal}
          disabled={!connected}
          className={`icon-button ${!connected ? 'disabled' : ''} ${cameraError ? 'error' : ''}`}
          title={cameraError || (cameraEnabled ? 'Disable camera' : 'Enable camera')}
        >
          <span className="material-icons">{cameraEnabled ? 'videocam' : 'videocam_off'}</span>
        </button>
        {!micEnabled && (
          <>
            <input
              type="text"
              placeholder={'Type a message...'}
              disabled={!connected}
              className={!connected ? 'disabled' : ''}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyUp={(e) => {
                if (e.key === 'Enter') {
                  console.log('⌨️ Enter key pressed!');
                  sendMessageEnhanced();
                }
              }}
            />
            <button
              onClick={() => {
                console.log('🔘 Send button clicked!');
                sendMessageEnhanced();
              }}
              disabled={!connected}
              className={`icon-button ${!connected ? 'disabled' : ''}`}
              title="Send message"
            >
              <span className="material-icons">send</span>
            </button>
            <button
              onClick={() => {
                // Add system message for interrupt
                addSystemMessage(`interrupt_${Date.now()}`, '🛑 User interrupted response', SystemEventType.INTERRUPT);
                interruptResponse(client, (cmd) => {
                  console.log(`Interrupt command sent: ${cmd}`);
                });
              }}
              disabled={!connected}
              className={`icon-button ${!connected ? 'disabled' : ''}`}
              title="Interrupt response"
            >
              <span className="material-icons">stop</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;

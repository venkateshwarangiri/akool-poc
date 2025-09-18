import { useState, useCallback, useEffect } from 'react';
import { RTCClient } from '../agoraHelper';
import { sendMessageToAvatar } from '../agoraHelper';
import { startRagStream } from '../services/ragClient';

// System event types enum
export enum SystemEventType {
  AVATAR_AUDIO_START = 'avatar_audio_start',
  AVATAR_AUDIO_END = 'avatar_audio_end',
  MIC_START = 'mic_start',
  MIC_END = 'mic_end',
  CAMERA_START = 'camera_start',
  CAMERA_END = 'camera_end',
  SET_PARAMS = 'set_params',
  SET_PARAMS_ACK = 'set_params_ack',
  INTERRUPT = 'interrupt',
  INTERRUPT_ACK = 'interrupt_ack',
}

// Message sender types
export enum MessageSender {
  USER = 'user',
  AVATAR = 'avatar',
  SYSTEM = 'system',
}

// Message types for better categorization
export enum MessageType {
  CHAT = 'chat',
  SYSTEM = 'system',
  EVENT = 'event',
  COMMAND = 'command',
}

// Type for user-triggered system events
export type UserTriggeredEventType =
  | SystemEventType.MIC_START
  | SystemEventType.MIC_END
  | SystemEventType.CAMERA_START
  | SystemEventType.CAMERA_END;

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  messageType: MessageType;
  timestamp: number;
  // System-specific fields
  systemType?: SystemEventType;
  // Additional data for tooltips and other features
  metadata?: {
    fullParams?: Record<string, unknown>; // For set-params messages
    [key: string]: unknown;
  };
}

interface UseMessageStateProps {
  client: RTCClient;
  connected: boolean;
  onStreamMessage?: (uid: number, body: Uint8Array) => void;
}

interface UseMessageStateReturn {
  messages: Message[];
  inputMessage: string;
  setInputMessage: (message: string) => void;
  sendMessage: () => Promise<void>;
  clearMessages: () => void;
  addMessage: (
    messageId: string,
    text: string,
    sender: MessageSender,
    messageType: MessageType,
    systemType?: SystemEventType,
    metadata?: Message['metadata'],
  ) => void;
  addChatMessage: (messageId: string, text: string, sender: MessageSender) => void;
  addSystemMessage: (
    messageId: string,
    text: string,
    systemType: SystemEventType,
    metadata?: Message['metadata'],
  ) => void;
  cleanupOldSystemMessages: () => void;
  formatTime: (timestamp: number) => string;
  shouldShowTimeSeparator: (currentMessage: Message, previousMessage: Message | undefined) => boolean;
}

// Utility function to format timestamp as HH:mm
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

// Utility function to check if time separator should be shown
const shouldShowTimeSeparator = (currentMessage: Message, previousMessage: Message | undefined): boolean => {
  if (!previousMessage) return false;
  const timeDiff = currentMessage.timestamp - previousMessage.timestamp;

  // Show separator if gap is more than 30 seconds
  if (timeDiff > 30000) return true;

  // Show separator every 5 minutes (300000 ms) regardless of gap
  const currentMinute = Math.floor(currentMessage.timestamp / 300000);
  const previousMinute = Math.floor(previousMessage.timestamp / 300000);

  return currentMinute > previousMinute;
};

export const useMessageState = ({
  client,
  connected,
  onStreamMessage,
}: UseMessageStateProps): UseMessageStateReturn => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Set up stream message listener
  useEffect(() => {
    if (connected && onStreamMessage) {
      // Store the handler reference so we can remove only this specific listener
      const messageHandler = onStreamMessage;
      console.log('🔍 useMessageState: Setting up stream message listener');
      client.on('stream-message', messageHandler);
      return () => {
        // Remove only this specific listener, not all listeners
        console.log('🔍 useMessageState: Removing stream message listener');
        client.off('stream-message', messageHandler);
      };
    }
  }, [client, connected, onStreamMessage]);

  const sendMessage = useCallback(async () => {
    // DISABLED: This function is disabled to prevent conflicts with sendMessageEnhanced
    // The ChatInterface now uses sendMessageEnhanced for RAG integration
    console.log('⚠️ useMessageState sendMessage is disabled - using sendMessageEnhanced instead');
    console.log('⚠️ useMessageState sendMessage called with inputMessage:', inputMessage);
    console.log('⚠️ useMessageState sendMessage called with connected:', connected);
    return;
    
    if (!inputMessage.trim() || !connected || sending) return;

    setSending(true);
    const messageId = Date.now().toString();

    // Add message to local state immediately
    const newMessage: Message = {
      id: messageId,
      text: inputMessage,
      sender: MessageSender.USER,
      messageType: MessageType.CHAT,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage('');

    const ragUrl = (import.meta as any)?.env?.VITE_RAG_BACKEND_URL as string | undefined;

    if (ragUrl) {
      // Stream from backend and forward to avatar incrementally
      try {
        let idx = 0;
        let accumulated = '';
        startRagStream(inputMessage, {
          onToken: async (token) => {
            accumulated += token;
            try {
              await sendMessageToAvatar(client, messageId, token);
            } catch (e) {
              console.error('Failed to forward token to avatar:', e);
            }
            idx++;
          },
          onDone: async () => {
            // Send a final empty chunk with fin=true by sending an empty string? Our helper sets fin=true only on last chunk. Here we already sent chunks token-by-token; nothing else required.
            // Update assistant message in chat to the final combined content
            setMessages((prev) => [
              ...prev,
              {
                id: `${messageId}-bot`,
                text: accumulated,
                sender: MessageSender.AVATAR,
                messageType: MessageType.CHAT,
                timestamp: Date.now(),
              },
            ]);
            setSending(false);
          },
          onError: (err) => {
            console.error('RAG stream error:', err);
            setSending(false);
          },
        });
      } catch (error) {
        console.error('Failed to start RAG stream:', error);
        setSending(false);
      }
    } else {
      try {
        await sendMessageToAvatar(client, messageId, inputMessage);
      } catch (error) {
        console.error('Failed to send message:', error);
        // Optionally remove the message from state if sending failed
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      } finally {
        setSending(false);
      }
    }
  }, [client, connected, inputMessage, sending]);

  const addMessage = useCallback(
    (
      messageId: string,
      text: string,
      sender: MessageSender,
      messageType: MessageType,
      systemType?: SystemEventType,
      metadata?: Message['metadata'],
    ) => {
      setMessages((prev) => {
        const currentTime = Date.now();
        // For system messages, always create a new message to avoid concatenation
        if (messageType === MessageType.SYSTEM) {
          return [
            ...prev,
            {
              id: `${messageId}_${currentTime}`,
              text,
              sender,
              messageType,
              systemType,
              timestamp: currentTime,
              metadata,
            },
          ];
        }

        // For regular messages, check if message already exists
        const existingMessageIndex = prev.findIndex((msg) => msg.id === messageId);
        if (existingMessageIndex !== -1) {
          // Update existing message
          const newMessages = [...prev];
          newMessages[existingMessageIndex] = {
            ...newMessages[existingMessageIndex],
            text: newMessages[existingMessageIndex].text + text,
            metadata,
          };
          return newMessages;
        }
        // Add new message
        return [
          ...prev,
          {
            id: messageId,
            text,
            sender,
            messageType,
            timestamp: currentTime,
            metadata,
          },
        ];
      });
    },
    [],
  );

  const addChatMessage = useCallback(
    (messageId: string, text: string, sender: MessageSender) => {
      addMessage(messageId, text, sender, MessageType.CHAT);
    },
    [addMessage],
  );

  const addSystemMessage = useCallback(
    (messageId: string, text: string, systemType: SystemEventType, metadata?: Message['metadata']) => {
      addMessage(messageId, text, MessageSender.SYSTEM, MessageType.SYSTEM, systemType, metadata);
    },
    [addMessage],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInputMessage('');
  }, []);

  // Clean up old system messages to keep chat history manageable
  const cleanupOldSystemMessages = useCallback(() => {
    setMessages((prev) => {
      // Keep only the last 10 system messages and all regular messages
      const systemMessages = prev.filter((msg) => msg.messageType === MessageType.SYSTEM);
      const regularMessages = prev.filter((msg) => msg.messageType === MessageType.CHAT);

      // Keep the last 10 system messages
      const recentSystemMessages = systemMessages.slice(-10);

      return [...regularMessages, ...recentSystemMessages].sort((a, b) => {
        // Sort by the order they appeared in the original array
        const aIndex = prev.findIndex((msg) => msg.id === a.id);
        const bIndex = prev.findIndex((msg) => msg.id === b.id);
        return aIndex - bIndex;
      });
    });
  }, []);

  // Auto-cleanup system messages when there are too many
  useEffect(() => {
    if (messages.filter((msg) => msg.messageType === MessageType.SYSTEM).length > 15) {
      cleanupOldSystemMessages();
    }
  }, [messages, cleanupOldSystemMessages]);

  return {
    messages,
    inputMessage,
    setInputMessage,
    sendMessage,
    clearMessages,
    addMessage,
    addChatMessage,
    addSystemMessage,
    cleanupOldSystemMessages,
    formatTime,
    shouldShowTimeSeparator,
  };
};

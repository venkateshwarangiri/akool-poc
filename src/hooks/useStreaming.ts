import { useState, useEffect, useCallback, useRef } from 'react';
import { IAgoraRTCRemoteUser, NetworkQuality, ILocalVideoTrack } from 'agora-rtc-sdk-ng';
import { UID } from 'agora-rtc-sdk-ng/esm';
import { Session, ApiService, Credentials } from '../apiService';
import { setAvatarParams, log, StreamMessage, CommandResponsePayload, ChatResponsePayload, RTCClient } from '../agoraHelper';
import { NetworkStats } from '../components/NetworkQuality';
import { useAgora } from '../contexts/AgoraContext';

/**
 * Avatar Configuration Types and Utilities
 *
 * Handles the transformation of user configuration into Agora stream metadata
 * with proper serialization and filtering of empty values.
 */

type AvatarConfig = {
  voiceId: string;
  voiceUrl: string;
  language: string;
  modeType: number;
  backgroundUrl: string;
  voiceParams: Record<string, unknown>;
};

/** Build avatar metadata object with clean, filtered values */
const buildAvatarMetadata = (config: AvatarConfig) => {
  const metadata = {
    vid: config.voiceId,
    vurl: config.voiceUrl,
    lang: config.language,
    mode: config.modeType,
    bgurl: config.backgroundUrl,
    vparams: config.voiceParams,
  };

  // Filter out falsy values to avoid sending empty parameters
  return Object.fromEntries(Object.entries(metadata).filter(([_, value]) => Boolean(value)));
};

interface StreamingState {
  isJoined: boolean;
  connected: boolean;
  remoteStats: NetworkStats | null;
  session: Session | null;
}

export const useStreaming = (
  avatarId: string,
  knowledgeId: string,
  sessionDuration: number,
  voiceId: string,
  voiceUrl: string,
  backgroundUrl: string,
  language: string,
  modeType: number,
  voiceParams: Record<string, unknown>,
  api: ApiService | null,
  localVideoTrack: ILocalVideoTrack | null,
  onSystemMessage?: (messageId: string, text: string, systemType: string, metadata?: Record<string, unknown>) => void,
  ragState?: { isEnabled: boolean; documentCount: number },
  sendMessageWithRAG?: (client: RTCClient, question: string, userId?: string, sessionId?: string, onChatMessage?: (messageId: string, text: string, sender: 'user' | 'bot') => void) => Promise<void>,
  onChatMessage?: (messageId: string, text: string, sender: 'user' | 'bot') => void,
) => {
  const { client } = useAgora();

  const [state, setState] = useState<StreamingState>({
    isJoined: false,
    connected: false,
    remoteStats: null,
    session: null,
  });

  // Helper function to update state partially
  const updateState = (newState: Partial<StreamingState>) => {
    setState((prevState) => ({ ...prevState, ...newState }));
  };

  // Event handlers
  const onException = useCallback((e: { code: number; msg: string; uid: UID }) => {
    log(e);
  }, []);

  const onTokenWillExpire = useCallback(() => {
    alert('Session will expire in 30s');
  }, []);

  const onTokenDidExpire = useCallback(() => {
    alert('Session expired');
    closeStreaming();
  }, []);

  const onUserPublish = useCallback(
    async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio' | 'datachannel') => {
      log('onUserPublish', user, mediaType);
      if (mediaType === 'video') {
        const remoteTrack = await client.subscribe(user, mediaType);
        remoteTrack.play('remote-video', { fit: 'contain' });
      } else if (mediaType === 'audio') {
        const remoteTrack = await client.subscribe(user, mediaType);
        remoteTrack.play();
      }
    },
    [client],
  );

  const onUserUnpublish = useCallback(
    async (user: IAgoraRTCRemoteUser, mediaType: 'video' | 'audio' | 'datachannel') => {
      log('onUserUnpublish', user, mediaType);
      await client.unsubscribe(user, mediaType);
    },
    [client],
  );

  // Track processed messages to prevent duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());

  const onStreamMessage = useCallback((uid: UID, body: Uint8Array) => {
    const msg = new TextDecoder().decode(body);
    log(`stream-message, uid=${uid}, size=${body.length}, msg=${msg}`);
    const { v, type, pld } = JSON.parse(msg) as StreamMessage;
    if (v !== 2) {
      log(`unsupported message version, v=${v}`);
      return;
    }
    if (type === 'command') {
      const { cmd, code, msg } = pld as CommandResponsePayload;
      log(`cmd-response, cmd=${cmd}, code=${code}, msg=${msg}`);
      if (code !== 1000) {
        alert(`cmd-response, cmd=${cmd}, code=${code}, msg=${msg}`);
      }
    } else if (type === 'chat') {
      const { text, from } = pld as ChatResponsePayload;
      log(`chat-message, from=${from}, text=${text}`);
      
      // Log all chat messages for debugging
      if (from === 'bot') {
        console.log('🤖 Avatar received bot message:', text);
        console.log('🤖 Bot message length:', text.length);
        console.log('🤖 Bot message preview:', text.substring(0, 100) + '...');
      }
      
      // Intercept voice messages from user and route through RAG system
      if (from === 'user') {
        // Create a unique key for this message to prevent duplicate processing
        const messageKey = `${text}_${Date.now()}`;
        
        // Check if we've already processed this message recently
        if (processedMessagesRef.current.has(messageKey)) {
          console.log('🚫 Duplicate message detected, skipping processing');
          return;
        }
        
        // Add to processed messages and clean up old ones
        processedMessagesRef.current.add(messageKey);
        if (processedMessagesRef.current.size > 10) {
          const firstKey = processedMessagesRef.current.values().next().value;
          if (firstKey) {
            processedMessagesRef.current.delete(firstKey);
          }
        }
        
        console.log('🎤 Voice message intercepted from user:', text);
        
        // Process voice message through RAG system if enabled
        if (ragState?.isEnabled && sendMessageWithRAG) {
          console.log('🧠 Processing voice message through RAG system');
          try {
            // Process the voice message through RAG and BLOCK the original message
            sendMessageWithRAG(client, text, 'user', `voice_session_${Date.now()}`, onChatMessage)
              .then(() => {
                console.log('✅ Voice message processed through RAG successfully');
              })
              .catch((error) => {
                console.error('❌ Error processing voice message through RAG:', error);
              });
            
            // IMPORTANT: Return early to prevent the original voice message from being processed
            return;
          } catch (error) {
            console.error('❌ Error calling RAG for voice message:', error);
          }
        }
      }
    }
  }, [ragState, sendMessageWithRAG, client]);

  // Main functions
  const joinChannel = useCallback(
    async (credentials: Credentials) => {
      const { agora_app_id, agora_channel, agora_token, agora_uid } = credentials;

      if (state.isJoined) {
        await leaveChannel();
      }

      client.on('exception', onException);
      client.on('user-published', onUserPublish);
      client.on('user-unpublished', onUserUnpublish);
      client.on('token-privilege-will-expire', onTokenWillExpire);
      client.on('token-privilege-did-expire', onTokenDidExpire);

      await client.join(agora_app_id, agora_channel, agora_token, agora_uid);

      client.on('network-quality', (stats: NetworkQuality) => {
        // Update remote stats
        const videoStats = client.getRemoteVideoStats();
        const audioStats = client.getRemoteAudioStats();
        const networkStats = client.getRemoteNetworkQuality();

        // Get the first remote user's stats
        const firstVideoStats = Object.values(videoStats)[0] || {};
        const firstAudioStats = Object.values(audioStats)[0] || {};
        const firstNetworkStats = Object.values(networkStats)[0] || {};

        updateState({
          remoteStats: {
            localNetwork: stats,
            remoteNetwork: firstNetworkStats,
            video: firstVideoStats,
            audio: firstAudioStats,
          },
        });
      });

      updateState({ isJoined: true });
    },
    [client, onException, onUserPublish, onUserUnpublish, onTokenWillExpire, onTokenDidExpire, state.isJoined],
  );

  const leaveChannel = useCallback(async () => {
    updateState({ isJoined: false });

    client.removeAllListeners('exception');
    client.removeAllListeners('user-published');
    client.removeAllListeners('user-unpublished');
    client.removeAllListeners('token-privilege-will-expire');
    client.removeAllListeners('token-privilege-did-expire');

    try {
      // Stop and close all local tracks before unpublishing
      const localTracks = client.localTracks;
      for (const track of localTracks) {
        try {
          track.stop();
          track.close();
        } catch (error) {
          console.error('Failed to stop/close local track:', error);
        }
      }

      // Unpublish all local tracks
      await client.unpublish();
    } catch (error) {
      console.error('Failed to unpublish tracks:', error);
    }

    await client.leave();
  }, [client]);

  // Custom hook for avatar parameter management
  const updateAvatarParams = useCallback(async () => {
    if (!client || !state.isJoined || !state.connected) {
      return;
    }

    const metadata = buildAvatarMetadata({
      voiceId,
      voiceUrl,
      language,
      modeType,
      backgroundUrl,
      voiceParams,
    });

    // Pass a callback to track command sends
    await setAvatarParams(client, metadata, (cmd, data) => {
      // Create system message for the command being sent
      if (onSystemMessage && cmd === 'set-params' && data) {
        const messageId = `cmd_send_${Date.now()}`;
        const messageText = `📤 ${cmd}`;
        onSystemMessage(messageId, messageText, 'set_params', { fullParams: data });
      }
    });
  }, [
    client,
    state.isJoined,
    state.connected,
    voiceId,
    voiceUrl,
    language,
    modeType,
    backgroundUrl,
    voiceParams,
    onSystemMessage,
  ]);

  const joinChat = useCallback(async () => {
    // Store the handler reference so we can remove only this specific listener
    const messageHandler = onStreamMessage;
    client.on('stream-message', messageHandler);
    updateState({ connected: true });
  }, [client, onStreamMessage]);

  const leaveChat = useCallback(async () => {
    updateState({ connected: false });
  }, []);

  // Auto-update avatar params when they change during active session
  useEffect(() => {
    if (state.isJoined && state.connected) {
      updateAvatarParams();
    }
  }, [state.isJoined, state.connected, voiceId, voiceUrl, language, modeType, backgroundUrl, voiceParams]);

  // Handle local video track publishing/unpublishing
  useEffect(() => {
    const handleVideoTrack = async () => {
      if (!state.isJoined) return;

      try {
        if (localVideoTrack) {
          // Publish the local video track
          await client.publish(localVideoTrack);
          log('Local video track published');
        } else {
          // Find and unpublish any existing video track
          const publishedTracks = client.localTracks;
          const videoTrack = publishedTracks.find((track) => track.trackMediaType === 'video');
          if (videoTrack) {
            await client.unpublish(videoTrack);
            log('Local video track unpublished');
          }
        }
      } catch (error) {
        console.error('Failed to handle video track:', error);
      }
    };

    handleVideoTrack();
  }, [client, localVideoTrack, state.isJoined]);

  const startStreaming = useCallback(async () => {
    if (!api) {
      alert('Please set host and token first');
      return;
    }

    const data = await api.createSession({
      avatar_id: avatarId,
      duration: sessionDuration * 60,
      ...(knowledgeId ? { knowledge_id: knowledgeId } : {}),
      ...(voiceId ? { voice_id: voiceId } : {}),
      ...(voiceUrl ? { voice_url: voiceUrl } : {}),
      ...(language ? { language: language } : {}),
      ...(modeType ? { mode_type: modeType } : {}),
      ...(backgroundUrl ? { background_url: backgroundUrl } : {}),
      ...(voiceParams && Object.keys(voiceParams).length > 0 ? { voice_params: voiceParams } : {}),
    });
    log(data);
    updateState({ session: data });

    const { stream_urls, credentials } = data;

    await joinChannel(credentials || stream_urls);
    await joinChat();
  }, [
    api,
    avatarId,
    knowledgeId,
    sessionDuration,
    joinChannel,
    joinChat,
    voiceId,
    voiceUrl,
    language,
    modeType,
    backgroundUrl,
    voiceParams,
  ]);

  const closeStreaming = useCallback(async () => {
    await leaveChat();
    await leaveChannel();
    if (!state.session) {
      log('session not found');
      return;
    }
    await api?.closeSession(state.session._id);
  }, [api, leaveChat, leaveChannel, state.session]);

  // Clean up event listeners and tracks when component unmounts
  useEffect(() => {
    return () => {
      // Remove all event listeners
      client.removeAllListeners('exception');
      client.removeAllListeners('user-published');
      client.removeAllListeners('user-unpublished');
      client.removeAllListeners('token-privilege-will-expire');
      client.removeAllListeners('token-privilege-did-expire');
      client.removeAllListeners('network-quality');
      client.removeAllListeners('stream-message');

      // Stop and close all local tracks
      try {
        const localTracks = client.localTracks;
        for (const track of localTracks) {
          try {
            track.stop();
            track.close();
          } catch (error) {
            console.error('Failed to stop/close local track during cleanup:', error);
          }
        }
      } catch (error) {
        console.error('Failed to cleanup local tracks on unmount:', error);
      }
    };
  }, [client]);

  return {
    ...state,
    startStreaming,
    closeStreaming,
  };
};

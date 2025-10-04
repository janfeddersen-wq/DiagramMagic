import { useState, useEffect, useRef } from 'react';
import { VoiceAgentService, VoiceAgentState } from '../services/voiceAgent';

interface UseVoiceAgentOptions {
  tokenEndpoint: string;
  onError?: (error: string) => void;
}

/**
 * Custom hook for managing voice agent state
 * Provides a clean interface for connecting/disconnecting and tracking state
 */
export function useVoiceAgent({ tokenEndpoint, onError }: UseVoiceAgentOptions) {
  const [state, setState] = useState<VoiceAgentState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const serviceRef = useRef<VoiceAgentService | null>(null);

  // Initialize service
  useEffect(() => {
    const service = new VoiceAgentService({ tokenEndpoint });
    serviceRef.current = service;

    // Subscribe to state changes
    const unsubscribe = service.onStateChange((newState) => {
      setState(newState);
      if (newState.error && onError) {
        onError(newState.error);
      }
    });

    return () => {
      unsubscribe();
      service.disconnect();
    };
  }, [tokenEndpoint, onError]);

  const connect = async () => {
    if (!serviceRef.current) return;
    try {
      await serviceRef.current.connect();
    } catch (error) {
      console.error('Failed to connect voice agent:', error);
    }
  };

  const disconnect = () => {
    if (!serviceRef.current) return;
    serviceRef.current.disconnect();
  };

  const toggle = async () => {
    if (state.isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  return {
    state,
    connect,
    disconnect,
    toggle,
    isActive: state.isConnected,
  };
}

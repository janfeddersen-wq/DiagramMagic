/**
 * Voice Agent Service
 * Manages LiveKit-based voice assistant connection
 */

interface VoiceAgentConfig {
  tokenEndpoint: string;
}

export interface VoiceAgentState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  roomName?: string;
}

export class VoiceAgentService {
  private config: VoiceAgentConfig;
  private state: VoiceAgentState = {
    isConnected: false,
    isConnecting: false,
    error: null,
  };
  private stateListeners: ((state: VoiceAgentState) => void)[] = [];

  constructor(config: VoiceAgentConfig) {
    this.config = config;
  }

  /**
   * Fetch connection token from backend
   */
  private async fetchToken(): Promise<{ token: string; url: string; roomName: string }> {
    const response = await fetch(this.config.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch voice agent token');
    }

    return response.json();
  }

  /**
   * Connect to voice agent
   */
  async connect(): Promise<void> {
    if (this.state.isConnected || this.state.isConnecting) {
      return;
    }

    this.updateState({ isConnecting: true, error: null });

    try {
      const { token, url, roomName } = await this.fetchToken();

      // Store connection info for LiveKit integration
      this.updateState({
        isConnected: true,
        isConnecting: false,
        roomName,
        error: null,
      });

      return;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: errorMessage,
      });
      throw error;
    }
  }

  /**
   * Disconnect from voice agent
   */
  disconnect(): void {
    this.updateState({
      isConnected: false,
      isConnecting: false,
      error: null,
      roomName: undefined,
    });
  }

  /**
   * Get current state
   */
  getState(): VoiceAgentState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: VoiceAgentState) => void): () => void {
    this.stateListeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.stateListeners = this.stateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<VoiceAgentState>): void {
    this.state = { ...this.state, ...updates };
    this.stateListeners.forEach(listener => listener(this.state));
  }
}

/**
 * Create a voice agent service instance
 */
export function createVoiceAgentService(tokenEndpoint: string): VoiceAgentService {
  return new VoiceAgentService({ tokenEndpoint });
}

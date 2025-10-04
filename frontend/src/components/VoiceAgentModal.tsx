import { useState, useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, useVoiceAssistant } from '@livekit/components-react';
import { Socket } from 'socket.io-client';
import '@livekit/components-styles';

interface VoiceAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  socket?: Socket; // Main app Socket.IO instance
  onAddProject?: (name: string) => void;
  onListProjects?: () => void;
  onSelectProject?: (projectId: number) => void;
  onSwitchToScratchMode?: () => void;
  onCreateDiagram?: (name: string) => void;
  onTalkToDiagram?: (message: string) => void;
}

function VoiceAssistantStatus() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="voice-assistant-status">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-3 h-3 rounded-full ${
          state === 'listening' ? 'bg-green-500 animate-pulse' :
          state === 'thinking' ? 'bg-yellow-500 animate-pulse' :
          state === 'speaking' ? 'bg-blue-500 animate-pulse' :
          'bg-gray-400'
        }`}></div>
        <span className="text-sm font-medium">
          {state === 'disconnected' && 'Disconnected'}
          {state === 'connecting' && 'Connecting...'}
          {state === 'listening' && 'Listening'}
          {state === 'thinking' && 'Thinking...'}
          {state === 'speaking' && 'Speaking'}
        </span>
      </div>

      {audioTrack && (
        <div className="flex gap-1 justify-center">
          <div className="w-1 h-8 bg-blue-500 animate-pulse"></div>
          <div className="w-1 h-12 bg-blue-500 animate-pulse" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1 h-6 bg-blue-500 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
        </div>
      )}
    </div>
  );
}

export function VoiceAgentModal({
  isOpen,
  onClose,
  socket,
  onAddProject,
  onListProjects,
  onSelectProject,
  onSwitchToScratchMode,
  onCreateDiagram,
  onTalkToDiagram
}: VoiceAgentModalProps) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if (isOpen && !connected) {
      fetchToken();
    }
  }, [isOpen]);

  // Register API key with backend Socket.IO and listen for voice agent events
  useEffect(() => {
    if (apiKey && socket) {
      console.log('✨ [UI] Registering voice agent API key...');
      socket.emit('voice-agent:register', apiKey);

      // Listen for all voice agent tool events
      socket.on('voice-agent:AddProject', (params) => {
        console.log('✅ [UI] AddProject event:', params);
        if (onAddProject) onAddProject(params.name);
      });

      socket.on('voice-agent:ListProjects', () => {
        console.log('✅ [UI] ListProjects event');
        if (onListProjects) onListProjects();
      });

      socket.on('voice-agent:SelectProject', (params) => {
        console.log('✅ [UI] SelectProject event:', params);
        if (onSelectProject) onSelectProject(params.projectId);
      });

      socket.on('voice-agent:SwitchToScratchMode', () => {
        console.log('✅ [UI] SwitchToScratchMode event');
        if (onSwitchToScratchMode) onSwitchToScratchMode();
      });

      socket.on('voice-agent:CreateDiagram', (params) => {
        console.log('✅ [UI] CreateDiagram event:', params);
        if (onCreateDiagram) onCreateDiagram(params.name);
      });

      socket.on('voice-agent:TalkToDiagram', (params) => {
        console.log('✅ [UI] TalkToDiagram event:', params);
        if (onTalkToDiagram) onTalkToDiagram(params.message);
      });

      socket.on('voice-agent:StopVoiceChat', () => {
        console.log('✅ [UI] StopVoiceChat event - closing modal');
        handleDisconnect();
      });

      return () => {
        socket.off('voice-agent:AddProject');
        socket.off('voice-agent:ListProjects');
        socket.off('voice-agent:SelectProject');
        socket.off('voice-agent:SwitchToScratchMode');
        socket.off('voice-agent:CreateDiagram');
        socket.off('voice-agent:TalkToDiagram');
        socket.off('voice-agent:StopVoiceChat');
      };
    }
  }, [apiKey, socket, onAddProject, onListProjects, onSelectProject, onSwitchToScratchMode, onCreateDiagram, onTalkToDiagram]);

  const fetchToken = async () => {
    try {
      setConnecting(true);
      setError('');

      const response = await fetch('http://localhost:3002/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch token');
      }

      const data = await response.json();
      setToken(data.token);
      setServerUrl(data.url);
      setApiKey(data.apiKey); // Store API key
      setConnected(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to voice agent');
      console.error('Error fetching token:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setToken('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Minimal floating status indicator */}
      <div className="absolute top-6 right-6 pointer-events-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-4 min-w-[280px]">
          <button
            onClick={handleDisconnect}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 500 500" fill="currentColor">
                <path d="M369.6,229.6c-2.8-4-5-7.1-6-8.8c-0.7-1.2-0.7-1.4,0.8-3.7c2.5-4.1,6.8-10.9,2.4-29.6c-6.7-28.7-25.1-52-32.6-58.2c-7.1-6-45.5-28.3-81.1-28.3c-8.1,0-16.5,0.9-25,2.5c-4.5,0.9-8.9,2-13.3,3.5v-2.3h-36.1v19.5c-6.2,1.7-12.1,4.1-17.5,7.3l-13.8-13.8l-25.5,25.5l13.8,13.8c-3.2,5.5-5.7,11.4-7.3,17.5h-19.5v36.1h19.5c1.6,6.1,4.1,12,7.3,17.5L121.9,242l25.5,25.5l6.6-6.6c2.3,4.1,4.6,7.8,6.8,11.4c9.1,14.7,16.3,26.4,15.1,50.1c-1.3,24.9-16.7,55-29.4,75.8l132.7-2.3l-2.6-59.4l0-2.1c0.6,0.1,1.3,0.3,2.1,0.4c1.2,0.2,2.6,0.5,4.1,0.8c0.3,0,0.6,0.1,0.8,0.2c0.6,0.1,1.1,0.2,1.7,0.3c2.1,0.4,4.5,0.9,7,1.4c1,0.2,2,0.4,3.1,0.6c1.1,0.2,2.1,0.5,3.2,0.6c1.7,0.3,3.4,0.6,5.1,1c0.6,0.1,1.2,0.2,1.8,0.4c9.4,1.8,19.4,3.8,28.1,5.3c1.8,0.3,3.6,0.6,5.3,0.9c5.1,0.9,9.4,1.6,12.4,2c0.6,0.1,1.2,0.1,1.7,0.2c1,0.1,1.7,0.2,2.3,0.2c10,0,12.7-10.7,12.7-17.1c0-3.3-1-6.6-1.8-9.2c-0.6-1.7-1.1-3.4-1.1-4.3c0-0.8,0.9-2.1,1.7-3.5c1.2-1.8,2.6-4.1,3.2-6.9c0.7-3.5,0.1-5.5-0.4-7c-0.2-0.7-0.3-1.2-0.3-1.7c0-0.6,0.9-1.5,1.8-2.4c0.7-0.7,1.5-1.4,2.1-2.3c2.5-3.4,2.5-7.6,0-11c-1.7-2.2-1.3-5.1-0.8-5.9c0.5-0.5,2.8-1.6,4.6-2.4c8.1-3.9,13.9-7,13.9-11.1C390.8,260.6,383.9,250.2,369.6,229.6z"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Voice Assistant</h3>
            </div>
          </div>

          {connecting && (
            <div className="text-center py-4">
              <div className="inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
              <p className="text-red-700 text-xs">{error}</p>
              <button
                onClick={fetchToken}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {connected && token && (
            <LiveKitRoom
              serverUrl={serverUrl}
              token={token}
              connect={true}
              audio={true}
              video={false}
              onDisconnected={handleDisconnect}
            >
              <VoiceAssistantStatus />
              <RoomAudioRenderer />
            </LiveKitRoom>
          )}
        </div>
      </div>
    </div>
  );
}

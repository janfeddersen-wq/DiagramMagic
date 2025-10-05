import { useState, useEffect } from 'react';

interface VoiceAgentButtonProps {
  onToggle: (isActive: boolean) => void;
  isActive?: boolean;
}

export function VoiceAgentButton({ onToggle, isActive = false }: VoiceAgentButtonProps) {
  const [active, setActive] = useState(isActive);

  useEffect(() => {
    setActive(isActive);
  }, [isActive]);

  const handleClick = () => {
    const newState = !active;
    setActive(newState);
    onToggle(newState);
  };

  return (
    <button
      onClick={handleClick}
      className={`voice-agent-button ${active ? 'active' : ''}`}
      title={active ? 'Deactivate Voice Agent' : 'Activate Voice Agent'}
      aria-label={active ? 'Deactivate Voice Agent' : 'Activate Voice Agent'}
    >
      <div className={`voice-agent-container ${active ? 'pulsing' : ''}`}>
        <svg
          viewBox="0 0 24 24"
          className="voice-agent-icon"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
    </button>
  );
}

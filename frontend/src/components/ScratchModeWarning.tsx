import { useState } from 'react';

interface ScratchModeWarningProps {
  onSaveToProject: () => void;
}

export function ScratchModeWarning({ onSaveToProject }: ScratchModeWarningProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-900">
              Scratch Mode - Changes will not be saved
            </p>
            <p className="text-xs text-orange-700 mt-0.5">
              Create or select a project to save your work and chat history
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSaveToProject}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            Save to Project
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-orange-600 hover:bg-orange-100 rounded transition-colors"
            title="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

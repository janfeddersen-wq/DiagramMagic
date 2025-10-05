import { useState, useEffect } from 'react';
import { DiagramVersion, listDiagramVersions } from '../services/projectsApi';
import { createLogger } from '../utils/logger';

const logger = createLogger('DiagramVersionHistory');

interface DiagramVersionHistoryProps {
  diagramId: number | null;
  currentVersion: DiagramVersion | null;
  onSelectVersion: (version: DiagramVersion) => void;
  refreshTrigger?: number;
}

export function DiagramVersionHistory({ diagramId, currentVersion, onSelectVersion, refreshTrigger }: DiagramVersionHistoryProps) {
  const [versions, setVersions] = useState<DiagramVersion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (diagramId && isOpen) {
      loadVersions();
    }
  }, [diagramId, isOpen, refreshTrigger]);

  const loadVersions = async () => {
    if (!diagramId) return;

    setIsLoading(true);
    try {
      const data = await listDiagramVersions(diagramId);
      setVersions(data);
    } catch (error) {
      logger.error('Failed to load versions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!diagramId) return null;

  return (
    <div className="border-t border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            Version History {currentVersion && `(v${currentVersion.version})`}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-6 pb-4 max-h-64 overflow-y-auto">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 text-sm">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">No versions found</div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <button
                  key={version.id}
                  onClick={() => onSelectVersion(version)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors border-2 ${
                    currentVersion?.id === version.id
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-gray-50 hover:bg-gray-100 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-900">
                      Version {version.version}
                    </span>
                    {currentVersion?.id === version.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </p>
                  <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-100 p-2 rounded max-h-20 overflow-hidden">
                    {version.mermaid_code.split('\n').slice(0, 3).join('\n')}
                    {version.mermaid_code.split('\n').length > 3 && '...'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

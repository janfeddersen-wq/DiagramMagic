import { useState, useEffect } from 'react';
import { Diagram, listDiagramsByProject, createDiagram, deleteDiagram } from '../services/projectsApi';
import { ConfirmModal } from './Modal';
import { createLogger } from '../utils/logger';

const logger = createLogger('DiagramsSidebar');

interface DiagramsSidebarProps {
  projectId: number | null;
  currentDiagram: Diagram | null;
  onSelectDiagram: (diagram: Diagram | null) => void;
  onCreateDiagram?: (name: string) => Promise<void>;
  refreshTrigger?: number; // Increment this to trigger a refresh
}

export function DiagramsSidebar({ projectId, currentDiagram, onSelectDiagram, onCreateDiagram, refreshTrigger }: DiagramsSidebarProps) {
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDiagramName, setNewDiagramName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; diagramId: number | null }>({ isOpen: false, diagramId: null });

  useEffect(() => {
    if (projectId) {
      loadDiagrams();
    } else {
      setDiagrams([]);
    }
  }, [projectId]);

  // Refresh diagrams when trigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && projectId) {
      loadDiagrams();
    }
  }, [refreshTrigger]);

  const loadDiagrams = async () => {
    if (!projectId) return;

    setIsLoading(true);
    try {
      const data = await listDiagramsByProject(projectId);
      setDiagrams(data);
    } catch (error) {
      logger.error('Failed to load diagrams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDiagram = async () => {
    if (!newDiagramName.trim() || !projectId) return;

    try {
      const result = await createDiagram(projectId, newDiagramName, 'graph TD\n  Start[Start]');
      setDiagrams([result.diagram, ...diagrams]);
      setNewDiagramName('');
      setIsCreating(false);
      onSelectDiagram(result.diagram);
    } catch (error) {
      logger.error('Failed to create diagram:', error);
    }
  };

  const handleDeleteDiagram = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ isOpen: true, diagramId: id });
  };

  const confirmDeleteDiagram = async () => {
    if (!confirmDelete.diagramId) return;

    try {
      await deleteDiagram(confirmDelete.diagramId);
      setDiagrams(diagrams.filter(d => d.id !== confirmDelete.diagramId));
      if (currentDiagram?.id === confirmDelete.diagramId) {
        onSelectDiagram(null);
      }
    } catch (error) {
      logger.error('Failed to delete diagram:', error);
    }
  };

  if (!projectId) {
    return (
      <div className="w-64 bg-white border-r border-gray-200 flex items-center justify-center p-4">
        <p className="text-sm text-gray-500 text-center">Select a project to view diagrams</p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Diagrams Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">Diagrams</h3>
        <button
          onClick={() => setIsCreating(true)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="New Diagram"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* New Diagram Form */}
      {isCreating && (
        <div className="px-3 py-3 border-b border-gray-200">
          <div className="bg-gray-50 rounded-lg p-3">
            <input
              type="text"
              value={newDiagramName}
              onChange={(e) => setNewDiagramName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateDiagram()}
              placeholder="Diagram name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateDiagram}
                className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewDiagramName('');
                }}
                className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diagrams List */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Loading...</div>
        ) : diagrams.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No diagrams yet
            <br />
            <button onClick={() => setIsCreating(true)} className="text-blue-600 hover:underline mt-2">
              Create your first diagram
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {diagrams.map((diagram) => (
              <button
                key={diagram.id}
                onClick={() => onSelectDiagram(diagram)}
                className={`w-full px-3 py-2 rounded-lg text-left transition-colors group ${
                  currentDiagram?.id === diagram.id
                    ? 'bg-blue-50 border-2 border-blue-300'
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{diagram.name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(diagram.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDiagram(diagram.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, diagramId: null })}
        onConfirm={confirmDeleteDiagram}
        title="Delete Diagram"
        message="Are you sure you want to delete this diagram? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}

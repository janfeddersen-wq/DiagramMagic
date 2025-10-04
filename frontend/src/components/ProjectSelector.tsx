import { useState, useEffect, useRef } from 'react';
import { Project, listProjects, createProject, deleteProject } from '../services/projectsApi';
import { ConfirmModal } from './Modal';

interface ProjectSelectorProps {
  currentProject: Project | null;
  onSelectProject: (project: Project | null) => void;
  isScratchMode: boolean;
  onScratchMode: () => void;
  refreshTrigger?: number; // Increment this to trigger a refresh
}

export function ProjectSelector({ currentProject, onSelectProject, isScratchMode, onScratchMode }: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; projectId: number | null }>({ isOpen: false, projectId: null });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    loadProjects();

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProjects = async () => {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;

    try {
      const project = await createProject(newProjectName);
      setProjects([project, ...projects]);
      setNewProjectName('');
      setIsCreating(false);
      onSelectProject(project);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleDeleteProject = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete({ isOpen: true, projectId: id });
  };

  const confirmDeleteProject = async () => {
    if (!confirmDelete.projectId) return;

    try {
      await deleteProject(confirmDelete.projectId);
      setProjects(projects.filter(p => p.id !== confirmDelete.projectId));
      if (currentProject?.id === confirmDelete.projectId) {
        onScratchMode();
      }
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <span className="text-sm font-medium text-gray-700">
          {isScratchMode ? 'Scratch Mode' : currentProject?.name || 'Select Project'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="fixed w-72 bg-white border border-gray-200 rounded-lg shadow-2xl z-[9999] max-h-96 overflow-hidden flex flex-col"
          style={{ top: `${dropdownPosition.top}px`, left: `${dropdownPosition.left}px` }}
        >
          {/* Scratch Mode Option */}
          <button
            onClick={() => {
              onScratchMode();
              setIsOpen(false);
            }}
            className={`px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 transition-colors ${
              isScratchMode ? 'bg-orange-50' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Scratch Mode</p>
                <p className="text-xs text-gray-500">Not saved</p>
              </div>
            </div>
          </button>

          {/* New Project Button */}
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-3 text-left border-b border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 text-blue-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium">New Project</span>
          </button>

          {/* New Project Form */}
          {isCreating && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateProject()}
                placeholder="Project name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateProject}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setNewProjectName('');
                  }}
                  className="flex-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Projects List */}
          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No projects yet
              </div>
            ) : (
              <div className="py-1">
                {projects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => {
                      onSelectProject(project);
                      setIsOpen(false);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors group ${
                      currentProject?.id === project.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteProject(project.id, e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        title="Delete project"
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
        </div>
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        onClose={() => setConfirmDelete({ isOpen: false, projectId: null })}
        onConfirm={confirmDeleteProject}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MermaidDiagram, MermaidDiagramRef } from './components/MermaidDiagram';
import { ChatPanel } from './components/ChatPanel';
import { HelpSection } from './components/HelpSection';
import { ProjectSelector } from './components/ProjectSelector';
import { DiagramsSidebar } from './components/DiagramsSidebar';
import { DiagramVersionHistory } from './components/DiagramVersionHistory';
import { ScratchModeWarning } from './components/ScratchModeWarning';
import { LoginModal, SignupModal } from './components/AuthModal';
import { WelcomePage } from './components/WelcomePage';
import { PromptModal, AlertModal } from './components/Modal';
import { VoiceAgentButton } from './components/VoiceAgentButton';
import { VoiceAgentModal } from './components/VoiceAgentModal';
import { useAuth } from './contexts/AuthContext';
import { RenderValidationRequest, RenderValidationResponse } from './types';
import { createProject, createDiagram } from './services/projectsApi';
import { useProject } from './hooks/useProject';
import { useDiagram } from './hooks/useDiagram';
import { useModals } from './hooks/useModals';
import { useChat } from './hooks/useChat';
import { createLogger } from './utils/logger';

const logger = createLogger('App');

function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const currentValidationRequestRef = useRef<string | null>(null);
  const mermaidDiagramRef = useRef<MermaidDiagramRef>(null);
  const [voiceAgentOpen, setVoiceAgentOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = useState(0);
  const [diagramsRefreshTrigger, setDiagramsRefreshTrigger] = useState(0);

  // Custom hooks for state management
  const project = useProject();
  const diagram = useDiagram();
  const modals = useModals();
  const chat = useChat(
    diagram.currentDiagram,
    project.currentProject?.id,
    diagram.currentDiagramObj?.id,
    (code) => diagram.updateDiagram(code, project.isScratchMode),
    socketRef.current || undefined
  );

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      logger.info('Connected to Socket.IO server');
    });

    socket.on('renderValidationRequest', (request: RenderValidationRequest) => {
      logger.info('Received render validation request:', request);
      currentValidationRequestRef.current = request.requestId;
      diagram.updateDiagram(request.mermaidCode, project.isScratchMode);
    });

    socket.on('disconnect', () => {
      logger.info('Disconnected from Socket.IO server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleRenderComplete = (success: boolean, error?: string) => {
    if (currentValidationRequestRef.current && socketRef.current) {
      const response: RenderValidationResponse = {
        requestId: currentValidationRequestRef.current,
        success,
        error
      };
      logger.info('Sending render validation response:', response);
      socketRef.current.emit('renderValidationResponse', response);
      currentValidationRequestRef.current = null;
    }
  };

  const handleSelectProject = async (projectParam: typeof project.currentProject) => {
    await project.selectProject(
      projectParam,
      (diagramObj, version, code) => {
        diagram.setDiagramState(diagramObj, version, code);
      },
      () => {
        chat.clearChat();
        diagram.clearDiagram();
      }
    );
  };

  const handleScratchMode = () => {
    project.enterScratchMode(() => {
      chat.clearChat();
      diagram.clearDiagram();
    });
  };

  const handleClearChat = () => {
    chat.clearChat();
    diagram.updateDiagram('', project.isScratchMode);
  };

  const handleVoiceAgentToggle = (isActive: boolean) => {
    setVoiceAgentOpen(isActive);
  };

  // Detect platform for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform);
  const shortcutKey = isMac ? '⌘K' : 'Ctrl+K';
  const shortcutPlatform = isMac ? 'Mac' : 'Windows/Linux';

  // Keyboard shortcut for voice agent (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isAuthenticated) {
          setVoiceAgentOpen(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthenticated]);

  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (userDropdownOpen && !target.closest('.user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };

    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userDropdownOpen]);

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // Show welcome page if not authenticated
  if (!isAuthenticated && !authLoading) {
    return (
      <>
        <WelcomePage onShowLogin={modals.openLoginModal} onShowSignup={modals.openSignupModal} />
        <LoginModal
          isOpen={modals.showLoginModal}
          onClose={modals.closeLoginModal}
          onSwitchToSignup={modals.openSignupModal}
        />
        <SignupModal
          isOpen={modals.showSignupModal}
          onClose={modals.closeSignupModal}
          onSwitchToLogin={modals.openLoginModal}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-5 shadow-sm relative z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  DiagramMagic
                </h1>
                <p className="text-sm text-gray-600">AI-powered Mermaid diagram generator</p>
              </div>
            </div>
            {isAuthenticated && (
              <ProjectSelector
                currentProject={project.currentProject}
                onSelectProject={handleSelectProject}
                isScratchMode={project.isScratchMode}
                onScratchMode={handleScratchMode}
                refreshTrigger={projectsRefreshTrigger}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Help Button */}
            <button
              onClick={() => setHelpModalOpen(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Help & Quick Start Guide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2">
                  <VoiceAgentButton
                    onToggle={handleVoiceAgentToggle}
                    isActive={voiceAgentOpen}
                  />
                  <span className="text-xs text-gray-500">
                    Press <kbd className="px-1.5 py-0.5 bg-gray-200 border border-gray-300 rounded text-xs font-mono">{shortcutKey}</kbd> to start
                  </span>
                </div>

                {/* User Dropdown */}
                <div className="relative user-dropdown-container">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{user?.name[0].toUpperCase()}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <button
                        onClick={() => {
                          logout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={modals.openAuthModal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Help Section */}
      <HelpSection
        onPromptClick={chat.sendMessage}
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
      />

      {/* Scratch Mode Warning */}
      {project.isScratchMode && <ScratchModeWarning />}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagrams Sidebar - Left */}
        {isAuthenticated && !project.isScratchMode && project.currentProject && (
          <DiagramsSidebar
            projectId={project.currentProject.id}
            currentDiagram={diagram.currentDiagramObj}
            onSelectDiagram={diagram.selectDiagram}
            onCreateDiagram={async (name) => {
              const result = await createDiagram(project.currentProject!.id, name, '');
              diagram.setDiagramState(result.diagram, result.version, '');
              chat.clearChat();
            }}
            refreshTrigger={diagramsRefreshTrigger}
          />
        )}

        {/* Center: Diagram */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-white rounded-tl-2xl shadow-xl overflow-hidden border-t border-l border-gray-200/50 m-4 mb-0">
            <div className="h-full flex flex-col">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50 px-6 py-4">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Diagram Preview
                  {diagram.currentVersion && <span className="text-sm text-gray-500">(v{diagram.currentVersion.version})</span>}
                </h2>
              </div>
              <div className="flex-1 relative">
                <MermaidDiagram
                  ref={mermaidDiagramRef}
                  diagram={diagram.currentDiagram}
                  socket={socketRef.current || undefined}
                  onRenderComplete={handleRenderComplete}
                />
              </div>
            </div>
          </div>

          {/* Version History */}
          {!project.isScratchMode && diagram.currentDiagramObj && (
            <DiagramVersionHistory
              diagramId={diagram.currentDiagramObj.id}
              currentVersion={diagram.currentVersion}
              onSelectVersion={diagram.selectVersion}
              refreshTrigger={diagram.versionRefreshTrigger}
            />
          )}
        </div>

        {/* Right: Chat */}
        <div className="w-[480px] bg-white rounded-tr-2xl shadow-xl overflow-hidden border-t border-r border-gray-200/50 m-4 mb-0 ml-0">
          <ChatPanel
            messages={chat.messages}
            onSendMessage={chat.sendMessage}
            onFileProcessed={chat.handleFileProcessed}
            onClearChat={handleClearChat}
            isLoading={chat.isLoading}
          />
        </div>
      </div>

      {/* Auth Modals */}
      <LoginModal
        isOpen={modals.showLoginModal}
        onClose={modals.closeLoginModal}
        onSwitchToSignup={modals.openSignupModal}
      />
      <SignupModal
        isOpen={modals.showSignupModal}
        onClose={modals.closeSignupModal}
        onSwitchToLogin={modals.openLoginModal}
      />

      {/* Prompt Modal */}
      <PromptModal
        isOpen={modals.promptModal.isOpen}
        onClose={modals.closePromptModal}
        onConfirm={modals.promptModal.onConfirm}
        title={modals.promptModal.title}
        message={modals.promptModal.message}
        defaultValue={modals.promptModal.defaultValue}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={modals.alertModal.isOpen}
        onClose={modals.closeAlertModal}
        title={modals.alertModal.title}
        message={modals.alertModal.message}
        type={modals.alertModal.type}
      />

      {/* Voice Agent Modal */}
      <VoiceAgentModal
        isOpen={voiceAgentOpen}
        onClose={() => setVoiceAgentOpen(false)}
        socket={socketRef.current || undefined}
        currentProjectId={project.currentProject?.id || null}
        onAddProject={async (name) => {
          if (!isAuthenticated) {
            modals.openAuthModal();
            return;
          }
          const newProject = await createProject(name);
          await handleSelectProject(newProject);
          setProjectsRefreshTrigger(prev => prev + 1); // Trigger refresh
        }}
        onListProjects={() => {
          // This will be handled by the agent returning the list to speak
          // The UI doesn't need to do anything special
        }}
        onSelectProject={async (projectId) => {
          if (!isAuthenticated) {
            modals.openAuthModal();
            return;
          }
          const { getProject } = await import('./services/projectsApi');
          const projectToSelect = await getProject(projectId);
          await handleSelectProject(projectToSelect);
        }}
        onSwitchToScratchMode={() => {
          handleScratchMode();
        }}
        onCreateDiagram={async (name) => {
          if (!project.currentProject) {
            modals.openAlertModal('Error', 'Please select a project first', 'error');
            return;
          }
          const newDiagram = await createDiagram(project.currentProject.id, name, 'graph TD\n  Start[Start]');
          setDiagramsRefreshTrigger(prev => prev + 1); // Trigger refresh first
          await diagram.loadDiagram(newDiagram.diagram.id);
        }}
        onListDiagrams={() => {
          // This will be handled by the agent returning the list to speak
          // The UI doesn't need to do anything special
        }}
        onSelectDiagram={async (diagramId) => {
          if (!isAuthenticated) {
            modals.openAuthModal();
            return;
          }
          await diagram.loadDiagram(diagramId);
        }}
        onTalkToDiagram={(message) => {
          chat.sendMessage(message);
        }}
        onSaveDiagramAsMarkdown={() => {
          mermaidDiagramRef.current?.saveAsMarkdown();
        }}
        onSaveDiagramAsImage={() => {
          mermaidDiagramRef.current?.saveAsImage();
        }}
        onOpenHelp={() => {
          setHelpModalOpen(true);
        }}
        onCloseHelp={() => {
          setHelpModalOpen(false);
        }}
        currentDiagram={diagram.currentDiagram}
      />
    </div>
  );
}

export default App;

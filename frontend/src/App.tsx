import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MermaidDiagram } from './components/MermaidDiagram';
import { ChatPanel } from './components/ChatPanel';
import { HelpSection } from './components/HelpSection';
import { ProjectSelector } from './components/ProjectSelector';
import { DiagramsSidebar } from './components/DiagramsSidebar';
import { DiagramVersionHistory } from './components/DiagramVersionHistory';
import { ScratchModeWarning } from './components/ScratchModeWarning';
import { AuthModal } from './components/AuthModal';
import { WelcomePage } from './components/WelcomePage';
import { PromptModal, AlertModal } from './components/Modal';
import { useAuth } from './contexts/AuthContext';
import { ChatMessage, RenderValidationRequest, RenderValidationResponse } from './types';
import { generateDiagram } from './services/api';
import { FileProcessedData } from './components/FileUpload';
import {
  Project,
  Diagram,
  DiagramVersion,
  createProject,
  createDiagram,
  createDiagramVersion,
  getDiagram,
  getProjectChatHistory,
  getDiagramChatHistory
} from './services/projectsApi';

function App() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentValidationRequestRef = useRef<string | null>(null);

  // Project management state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentDiagramObj, setCurrentDiagramObj] = useState<Diagram | null>(null);
  const [currentVersion, setCurrentVersion] = useState<DiagramVersion | null>(null);
  const [isScratchMode, setIsScratchMode] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Modal state
  const [promptModal, setPromptModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: (value: string) => void; defaultValue?: string }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    defaultValue: ''
  });
  const [alertModal, setAlertModal] = useState<{ isOpen: boolean; title: string; message: string; type?: 'info' | 'success' | 'warning' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // Initialize Socket.IO connection
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socket.on('renderValidationRequest', (request: RenderValidationRequest) => {
      console.log('Received render validation request:', request);
      currentValidationRequestRef.current = request.requestId;
      setCurrentDiagram(request.mermaidCode);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Load diagram chat history when diagram is selected
  useEffect(() => {
    if (currentDiagramObj && !isScratchMode) {
      loadDiagramChatHistory();
    }
  }, [currentDiagramObj]);

  const loadDiagramChatHistory = async () => {
    if (!currentDiagramObj) return;

    try {
      const chatMessages = await getDiagramChatHistory(currentDiagramObj.id);
      setMessages(chatMessages.map(msg => ({ role: msg.role, content: msg.content })));
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const handleRenderComplete = (success: boolean, error?: string) => {
    if (currentValidationRequestRef.current && socketRef.current) {
      const response: RenderValidationResponse = {
        requestId: currentValidationRequestRef.current,
        success,
        error
      };
      console.log('Sending render validation response:', response);
      socketRef.current.emit('renderValidationResponse', response);
      currentValidationRequestRef.current = null;
    }
  };

  const handleFileProcessed = async (data: FileProcessedData) => {
    if (data.type === 'image' && data.diagram) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: `I've uploaded an image. Please review and validate this Mermaid diagram code, fix any issues if needed:\n\n\`\`\`mermaid\n${data.diagram}\n\`\`\``
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await generateDiagram(
          `Please review and validate this Mermaid diagram code that was generated from an image. Fix any syntax errors or issues if needed:\n\n\`\`\`mermaid\n${data.diagram}\n\`\`\``,
          messages,
          currentDiagram,
          currentProject?.id,
          currentDiagramObj?.id
        );

        if (response.success) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.chatAnswer
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (response.mermaidDiagram) {
            await handleDiagramUpdate(response.mermaidDiagram);
          }
        } else {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: `Error: ${response.error || 'Failed to process diagram'}`
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } catch (error) {
        console.error('Error:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with server'}`
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } else if (data.type === 'document' && data.markdown) {
      const userMessage: ChatMessage = {
        role: 'user',
        content: `I've uploaded a document with the following content:\n\n${data.markdown}\n\nPlease use this as context for creating diagrams.`
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: 'I\'ve received your document. I can now use this information to create diagrams. What would you like me to visualize?'
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }
  };

  const handleDiagramUpdate = async (mermaidCode: string) => {
    setCurrentDiagram(mermaidCode);

    // If in project mode, save as new version
    if (!isScratchMode && currentDiagramObj) {
      try {
        const version = await createDiagramVersion(currentDiagramObj.id, mermaidCode);
        setCurrentVersion(version);
      } catch (error) {
        console.error('Failed to save diagram version:', error);
      }
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCurrentDiagram('');
    if (isScratchMode) {
      // In scratch mode, just clear
    } else {
      // In project mode, maybe ask for confirmation?
    }
  };

  const handleExamplePromptClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleSendMessage = async (prompt: string) => {
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateDiagram(
        prompt,
        messages,
        currentDiagram,
        currentProject?.id,
        currentDiagramObj?.id
      );

      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.chatAnswer
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (response.mermaidDiagram) {
          await handleDiagramUpdate(response.mermaidDiagram);
        }
      } else {
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `Error: ${response.error || 'Failed to generate diagram'}`
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to communicate with server'}`
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProject = async (project: Project | null) => {
    setCurrentProject(project);
    setIsScratchMode(!project);
    setMessages([]);
    setCurrentDiagram('');
    setCurrentDiagramObj(null);
    setCurrentVersion(null);

    // Load the latest diagram for this project if available
    if (project) {
      try {
        const { listDiagramsByProject } = await import('./services/projectsApi');
        const diagrams = await listDiagramsByProject(project.id);

        if (diagrams.length > 0) {
          // Select the most recently updated diagram
          const latestDiagram = diagrams[0];
          const fullDiagram = await getDiagram(latestDiagram.id);

          setCurrentDiagramObj(fullDiagram.diagram);
          if (fullDiagram.latestVersion) {
            setCurrentVersion(fullDiagram.latestVersion);
            setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
          }
        }
      } catch (error) {
        console.error('Failed to load project diagrams:', error);
      }
    }
  };

  const handleScratchMode = () => {
    setIsScratchMode(true);
    setCurrentProject(null);
    setCurrentDiagramObj(null);
    setCurrentVersion(null);
    setMessages([]);
    setCurrentDiagram('');
  };

  const handleSaveToProject = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    setPromptModal({
      isOpen: true,
      title: 'Create New Project',
      message: 'Enter project name:',
      onConfirm: async (projectName) => {
        if (!projectName) return;

        setPromptModal({
          isOpen: true,
          title: 'Create Diagram',
          message: 'Enter diagram name:',
          defaultValue: 'Untitled Diagram',
          onConfirm: async (diagramName) => {
            try {
              const project = await createProject(projectName);
              const diagram = await createDiagram(project.id, diagramName || 'Untitled Diagram', currentDiagram);

              setCurrentProject(project);
              setCurrentDiagramObj(diagram.diagram);
              setCurrentVersion(diagram.version);
              setIsScratchMode(false);

              setAlertModal({
                isOpen: true,
                title: 'Success',
                message: 'Saved to project successfully!',
                type: 'success'
              });
            } catch (error) {
              console.error('Failed to save to project:', error);
              setAlertModal({
                isOpen: true,
                title: 'Error',
                message: 'Failed to save to project',
                type: 'error'
              });
            }
          }
        });
      }
    });
  };

  const handleSelectVersion = async (version: DiagramVersion) => {
    setCurrentVersion(version);
    setCurrentDiagram(version.mermaid_code);
  };

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
        <WelcomePage onShowAuth={() => setShowAuthModal(true)} />
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
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
                currentProject={currentProject}
                onSelectProject={handleSelectProject}
                isScratchMode={isScratchMode}
                onScratchMode={handleScratchMode}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{user?.name[0].toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                  title="Sign Out"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Help Section */}
      <HelpSection onPromptClick={handleExamplePromptClick} />

      {/* Scratch Mode Warning */}
      {isScratchMode && <ScratchModeWarning onSaveToProject={handleSaveToProject} />}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Diagrams Sidebar - Left */}
        {isAuthenticated && !isScratchMode && currentProject && (
          <DiagramsSidebar
            projectId={currentProject.id}
            currentDiagram={currentDiagramObj}
            onSelectDiagram={async (diagram) => {
              if (!diagram) {
                setCurrentDiagramObj(null);
                setCurrentVersion(null);
                setCurrentDiagram('');
                return;
              }

              setCurrentDiagramObj(diagram);

              // Load full diagram with versions
              const fullDiagram = await getDiagram(diagram.id);
              if (fullDiagram.latestVersion) {
                setCurrentVersion(fullDiagram.latestVersion);
                setCurrentDiagram(fullDiagram.latestVersion.mermaid_code);
              }
            }}
            onCreateDiagram={async (name) => {
              // Create a blank diagram with fresh chat
              const result = await createDiagram(currentProject.id, name, '');
              setCurrentDiagramObj(result.diagram);
              setCurrentVersion(result.version);
              setCurrentDiagram('');
              setMessages([]); // Clear chat for new diagram
            }}
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
                  {currentVersion && <span className="text-sm text-gray-500">(v{currentVersion.version})</span>}
                </h2>
              </div>
              <div className="flex-1 relative">
                <MermaidDiagram
                  diagram={currentDiagram}
                  socket={socketRef.current || undefined}
                  onRenderComplete={handleRenderComplete}
                />
              </div>
            </div>
          </div>

          {/* Version History */}
          {!isScratchMode && currentDiagramObj && (
            <DiagramVersionHistory
              diagramId={currentDiagramObj.id}
              currentVersion={currentVersion}
              onSelectVersion={handleSelectVersion}
            />
          )}
        </div>

        {/* Right: Chat */}
        <div className="w-[480px] bg-white rounded-tr-2xl shadow-xl overflow-hidden border-t border-r border-gray-200/50 m-4 mb-0 ml-0">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onFileProcessed={handleFileProcessed}
            onClearChat={handleClearChat}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Prompt Modal */}
      <PromptModal
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        onConfirm={promptModal.onConfirm}
        title={promptModal.title}
        message={promptModal.message}
        defaultValue={promptModal.defaultValue}
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default App;

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { MermaidDiagram } from './components/MermaidDiagram';
import { ChatPanel } from './components/ChatPanel';
import { ChatMessage, RenderValidationRequest, RenderValidationResponse } from './types';
import { generateDiagram } from './services/api';
import { FileProcessedData } from './components/FileUpload';

function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const currentValidationRequestRef = useRef<string | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Connect to same origin - Vite will proxy to backend
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
      // For images, send the generated mermaid code through the AI agent for validation and potential fixes
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
          currentDiagram
        );

        if (response.success) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.chatAnswer
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (response.mermaidDiagram) {
            setCurrentDiagram(response.mermaidDiagram);
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
      // For documents, add to chat as context
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

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSendMessage = async (prompt: string) => {
    // Add user message
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateDiagram(prompt, messages, currentDiagram);

      if (response.success) {
        // Add assistant message
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.chatAnswer
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Update diagram
        if (response.mermaidDiagram) {
          setCurrentDiagram(response.mermaidDiagram);
        }
      } else {
        // Add error message
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

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              DiagramAI
            </h1>
            <p className="text-sm text-gray-600">AI-powered Mermaid diagram generator</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        {/* Left: Diagram */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200/50">
          <div className="h-full flex flex-col">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200/50 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Diagram Preview
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

        {/* Right: Chat */}
        <div className="w-[480px] bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200/50">
          <ChatPanel
            messages={messages}
            onSendMessage={handleSendMessage}
            onFileProcessed={handleFileProcessed}
            onClearChat={handleClearChat}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

export default App;

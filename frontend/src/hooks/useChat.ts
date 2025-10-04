import { useState, useEffect } from 'react';
import { ChatMessage } from '../types';
import { generateDiagram } from '../services/api';
import { getDiagramChatHistory } from '../services/projectsApi';
import { FileProcessedData } from '../components/FileUpload';

export function useChat(
  currentDiagram: string,
  projectId: number | undefined,
  diagramId: number | undefined,
  onDiagramUpdate: (mermaidCode: string) => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load diagram chat history when diagram changes
  useEffect(() => {
    if (diagramId) {
      loadChatHistory(diagramId);
    }
  }, [diagramId]);

  const loadChatHistory = async (diagramId: number) => {
    try {
      const chatMessages = await getDiagramChatHistory(diagramId);
      setMessages(chatMessages.map(msg => ({ role: msg.role, content: msg.content })));
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async (prompt: string) => {
    const userMessage: ChatMessage = { role: 'user', content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await generateDiagram(
        prompt,
        messages,
        currentDiagram,
        projectId,
        diagramId
      );

      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.chatAnswer
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (response.mermaidDiagram) {
          await onDiagramUpdate(response.mermaidDiagram);
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
          projectId,
          diagramId
        );

        if (response.success) {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: response.chatAnswer
          };
          setMessages((prev) => [...prev, assistantMessage]);

          if (response.mermaidDiagram) {
            await onDiagramUpdate(response.mermaidDiagram);
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

  const clearChat = () => {
    setMessages([]);
  };

  return {
    messages,
    isLoading,
    sendMessage,
    handleFileProcessed,
    clearChat,
    setMessages,
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiagramRequest {
  prompt: string;
  chatHistory: ChatMessage[];
  currentDiagram?: string;
}

export interface DiagramResponse {
  chatAnswer: string;
  mermaidDiagram: string;
  success: boolean;
  error?: string;
}

export interface AgentThought {
  thought: string;
  action: 'generate' | 'validate' | 'fix';
  observation?: string;
}

export interface RenderValidationRequest {
  requestId: string;
  mermaidCode: string;
}

export interface RenderValidationResponse {
  requestId: string;
  success: boolean;
  error?: string;
}

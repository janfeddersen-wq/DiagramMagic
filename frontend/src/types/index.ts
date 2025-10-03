export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface DiagramResponse {
  chatAnswer: string;
  mermaidDiagram: string;
  success: boolean;
  error?: string;
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

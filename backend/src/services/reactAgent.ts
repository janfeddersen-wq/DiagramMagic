import OpenAI from 'openai';
import { ChatMessage, DiagramResponse, RenderValidationRequest, RenderValidationResponse } from '../types/index.js';
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';

export class ReactAgent {
  private client: OpenAI;
  private model: string;
  private io?: Server;
  private renderValidationPromises: Map<string, {
    resolve: (value: RenderValidationResponse) => void;
    reject: (reason?: any) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  constructor(apiKey: string, model: string = 'llama3.1-8b', io?: Server) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.cerebras.ai/v1'
    });
    this.model = model;
    this.io = io;
  }

  public setupSocketListeners(socket: any) {
    socket.on('renderValidationResponse', (response: RenderValidationResponse) => {
      this.handleRenderValidationResponse(response);
    });
  }

  async generateDiagram(
    prompt: string,
    chatHistory: ChatMessage[],
    currentDiagram?: string,
    socketId?: string
  ): Promise<DiagramResponse> {
    try {
      let generateResult = await this.generateInitialDiagram(prompt, chatHistory, currentDiagram);
      let cleanedDiagram = this.cleanMermaidCode(generateResult.diagram);

      // Validate the diagram if Socket.IO is available
      if (this.io && cleanedDiagram && socketId) {
        const maxRetries = 20;
        let attempt = 0;
        let lastError: string | undefined;

        while (attempt < maxRetries) {
          const validationResult = await this.validateDiagramRender(cleanedDiagram, socketId);

          if (validationResult.success) {
            // Success! Return the working diagram
            return {
              chatAnswer: attempt === 0
                ? generateResult.answer
                : `${generateResult.answer} (Fixed after ${attempt} attempt${attempt > 1 ? 's' : ''})`,
              mermaidDiagram: cleanedDiagram,
              success: true
            };
          }

          // Validation failed
          lastError = validationResult.error;
          attempt++;

          if (attempt < maxRetries) {
            // Try to fix it
            const fixResult = await this.fixDiagram(
              cleanedDiagram,
              validationResult.error || 'Unknown rendering error',
              prompt,
              chatHistory
            );

            cleanedDiagram = this.cleanMermaidCode(fixResult.diagram);
            generateResult.answer = fixResult.answer;
          }
        }

        // If we've exhausted all retries, return the last attempt with error info
        return {
          chatAnswer: `${generateResult.answer}\n\nNote: After ${maxRetries} attempts, the diagram still has rendering issues: ${lastError}`,
          mermaidDiagram: cleanedDiagram,
          success: false,
          error: lastError
        };
      }

      return {
        chatAnswer: generateResult.answer,
        mermaidDiagram: cleanedDiagram,
        success: true
      };
    } catch (error) {
      return {
        chatAnswer: error instanceof Error ? error.message : 'Failed to generate diagram',
        mermaidDiagram: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private cleanMermaidCode(code: string): string {
    if (!code) return code;

    // Remove markdown code fences (```mermaid and ```)
    let cleaned = code.trim();

    // Remove starting ```mermaid or ```
    cleaned = cleaned.replace(/^```mermaid\s*/i, '');
    cleaned = cleaned.replace(/^```\s*/, '');

    // Remove ending ```
    cleaned = cleaned.replace(/\s*```$/, '');

    return cleaned.trim();
  }

  private async validateDiagramRender(mermaidCode: string, socketId: string): Promise<RenderValidationResponse> {
    if (!this.io) {
      return { requestId: '', success: true }; // Skip validation if no Socket.IO
    }

    const requestId = randomUUID();
    const request: RenderValidationRequest = {
      requestId,
      mermaidCode
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.renderValidationPromises.delete(requestId);
        resolve({ requestId, success: true }); // Assume success on timeout
      }, 5000); // 5 second timeout

      this.renderValidationPromises.set(requestId, { resolve, reject, timeout });

      // Emit to specific socket instead of broadcasting
      const socket = this.io!.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('renderValidationRequest', request);
      } else {
        // Socket not found, resolve immediately
        clearTimeout(timeout);
        this.renderValidationPromises.delete(requestId);
        resolve({ requestId, success: true });
      }
    });
  }

  private handleRenderValidationResponse(response: RenderValidationResponse) {
    const promise = this.renderValidationPromises.get(response.requestId);
    if (promise) {
      clearTimeout(promise.timeout);
      promise.resolve(response);
      this.renderValidationPromises.delete(response.requestId);
    }
  }

  private async fixDiagram(
    originalDiagram: string,
    error: string,
    originalPrompt: string,
    chatHistory: ChatMessage[]
  ): Promise<{ diagram: string; answer: string }> {
    const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert at creating Mermaid diagrams. You help users fix rendering errors in their diagrams.

When responding, you MUST return a JSON object with this exact structure:
{
  "chatAnswer": "Your explanation of what was wrong and how you fixed it",
  "mermaidDiagram": "The corrected Mermaid diagram code"
}

Rules for Mermaid diagrams:
- Always include the diagram type (graph, flowchart, sequenceDiagram, etc.)
- Use proper Mermaid syntax
- Make diagrams clear and well-structured, with logical color scheme
- For flowcharts, use "flowchart TD" or "graph TD" syntax
- Ensure all nodes and connections are properly defined
- IMPORTANT: Do NOT wrap the mermaidDiagram value in triple backticks or code fences. Return ONLY the raw Mermaid code.

Visual Styling with init configuration:
- You can customize diagram appearance using the %%{init: {...}}%% directive at the start
- Example for mindmaps: %%{init: {"mindmap": {"padding": 70, "nodeSpacing": 40, "rankSpacing": 50}}}%%
- Example for flowcharts: %%{init: {"flowchart": {"curve": "basis", "padding": 20}}}%%
- Example for themes: %%{init: {"theme": "dark", "themeVariables": {"primaryColor": "#ff6b6b"}}}%%
- Common customizations: padding, nodeSpacing, rankSpacing, curve styles, colors, fontSize
- When users ask for "better looking", "more space", "adjust spacing", or "change colors", apply appropriate init configs

Recent conversation context:
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}`
      },
      {
        role: 'user',
        content: `The following Mermaid diagram failed to render with this error:

Error: ${error}

Original diagram:
\`\`\`mermaid
${originalDiagram}
\`\`\`

Original request: ${originalPrompt}

Please fix the diagram so it renders correctly.`
      }
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: contextMessages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      diagram: parsed.mermaidDiagram || originalDiagram,
      answer: parsed.chatAnswer || 'I\'ve attempted to fix the rendering error.'
    };
  }

  private async generateInitialDiagram(
    prompt: string,
    chatHistory: ChatMessage[],
    currentDiagram?: string
  ): Promise<{ diagram: string; answer: string }> {
    const contextMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert at creating Mermaid diagrams. You help users create and modify diagrams based on their requests.

When responding, you MUST return a JSON object with this exact structure:
{
  "chatAnswer": "Your conversational response to the user",
  "mermaidDiagram": "The complete Mermaid diagram code"
}

Rules for Mermaid diagrams:
- Always include the diagram type (graph, flowchart, sequenceDiagram, etc.)
- Use proper Mermaid syntax
- Make diagrams clear and well-structured
- For flowcharts, use "flowchart TD" or "graph TD" syntax
- Ensure all nodes and connections are properly defined
- IMPORTANT: Do NOT wrap the mermaidDiagram value in triple backticks or code fences. Return ONLY the raw Mermaid code.

Visual Styling with init configuration:
- You can customize diagram appearance using the %%{init: {...}}%% directive at the start of the diagram
- Example for mindmaps with spacing:
  %%{init: {"mindmap": {"padding": 70, "nodeSpacing": 40, "rankSpacing": 50}}}%%
  mindmap
    root((Main Topic))
- Example for flowcharts with curves:
  %%{init: {"flowchart": {"curve": "basis", "padding": 20}}}%%
  flowchart TD
- Example for custom theme colors:
  %%{init: {"theme": "base", "themeVariables": {"primaryColor": "#ff6b6b", "primaryTextColor": "#fff"}}}%%
- Common customizations: padding, nodeSpacing, rankSpacing, curve (linear/basis/cardinal/monotone), fontSize
- When users ask to "make it prettier", "add more space", "adjust spacing", "change colors", or "improve visual appeal", apply appropriate init configurations
- For icons in mindmaps, use ::icon(fa fa-icon-name) syntax

${currentDiagram ? `Current diagram:\n${currentDiagram}` : 'No current diagram exists.'}

Recent conversation context:
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: contextMessages,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    return {
      diagram: parsed.mermaidDiagram || '',
      answer: parsed.chatAnswer || 'Diagram generated.'
    };
  }

}

import OpenAI from 'openai';
import { ChatMessage, DiagramResponse, RenderValidationRequest, RenderValidationResponse } from '../types/index.js';
import { Server } from 'socket.io';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

export class ReactAgent {
  private client: OpenAI;
  private model: string;
  private io?: Server;
  private mermaidSyntaxGuide: string;
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

    // Load Mermaid syntax guide from llms.txt
    try {
      const llmsPath = join(process.cwd(), 'llms.txt');
      this.mermaidSyntaxGuide = readFileSync(llmsPath, 'utf-8');
    } catch (error) {
      console.warn('Warning: Could not load llms.txt, using basic syntax guide');
      this.mermaidSyntaxGuide = 'Use proper Mermaid.js syntax for diagrams.';
    }
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
        const maxRetries = 40;
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

IMPORTANT: Do NOT wrap the mermaidDiagram value in triple backticks or code fences. Return ONLY the raw Mermaid code.

# ABSOLUTE RULES - NEVER VIOLATE:

1. **NEVER EVER CHANGE THE DIAGRAM TYPE** - This is the most important rule:
   - If it's xychart-beta, keep it xychart-beta (DO NOT change to graph, flowchart, or any other type)
   - If it's a flowchart, keep it a flowchart
   - If it's a sequenceDiagram, keep it sequenceDiagram
   - The diagram type keyword (first line) must NEVER change
   - Even if you think another type would work better, DO NOT CHANGE IT
   - The original diagram type was chosen for a reason - respect that choice

2. **FIX ONLY THE SYNTAX ERROR** - Make minimal changes:
   - Fix typos in keywords (but keep the same diagram type)
   - Fix malformed data definitions
   - Fix broken syntax within the diagram type
   - Fix indentation issues
   - Fix quote/bracket mismatches
   - DO NOT restructure, redesign, or simplify

3. **PRESERVE EXACT CONTENT**:
   - Keep all data points, nodes, edges, and labels exactly as they are
   - Maintain the same flow and relationships
   - Don't remove elements (unless they directly cause a parse error)
   - Don't add new elements (unless required by the diagram type syntax)

4. **DEBUG USING THE SYNTAX REFERENCE**:
   - Find the EXACT diagram type in the reference below
   - Study the "Basic Syntax" and "Example" sections for that type
   - Compare line-by-line with the correct syntax pattern
   - Apply ONLY the syntax fix needed
   - Follow the exact formatting shown in examples

5. **COMMON XYCHART-BETA FIXES** (if diagram type is xychart-beta):
   - Ensure x-axis array has square brackets: x-axis [item1, item2, ...]
   - Ensure y-axis has proper format: y-axis "Label" min --> max
   - Ensure bar/line data is in square brackets: bar [value1, value2, ...]
   - Check for proper indentation (4 spaces for each line after diagram type)
   - Verify all values are numbers (not strings) in data arrays

# Mermaid Syntax Reference
${this.mermaidSyntaxGuide}

Recent conversation context:
${chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}

REMEMBER: The diagram type on the first line (like xychart-beta, flowchart, sequenceDiagram) must NEVER change. Only fix syntax errors within that type.`
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

IMPORTANT: Do NOT wrap the mermaidDiagram value in triple backticks or code fences. Return ONLY the raw Mermaid code.

# Critical Instructions:
1. **Select the CORRECT diagram type** based on what the user is asking for:
   - For bar charts, line charts, or x-y data → use xychart-beta
   - For flowcharts/process flows → use flowchart TD/LR
   - For sequence interactions → use sequenceDiagram
   - For class structures → use classDiagram
   - For state machines → use stateDiagram-v2
   - For database relationships → use erDiagram
   - And so on (refer to the syntax reference below)

2. **Follow the EXACT syntax structure** from the reference below:
   - Use the correct keyword (flowchart, sequenceDiagram, xychart-beta, etc.)
   - Follow the syntax patterns shown in the examples
   - Use proper node shapes, arrows, and connectors as specified
   - Respect indentation and formatting rules

3. **Study the examples** in the syntax reference to understand proper usage

# Mermaid Syntax Reference
${this.mermaidSyntaxGuide}

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

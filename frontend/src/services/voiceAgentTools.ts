/**
 * Voice Agent Tools Infrastructure
 *
 * This module provides a modular system for registering and managing
 * tools that can be used by the voice agent. Tools are functions that
 * the AI can call to perform specific actions.
 *
 * Example tools that can be added in the future:
 * - Diagram generation commands
 * - Project navigation
 * - Chat history queries
 * - Version control operations
 */

export interface VoiceAgentToolParameter {
  type: string;
  description: string;
  enum?: string[];
  required?: boolean;
}

export interface VoiceAgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, VoiceAgentToolParameter>;
  execute: (params: Record<string, any>) => Promise<any>;
}

/**
 * Registry for voice agent tools
 */
class VoiceAgentToolRegistry {
  private tools: Map<string, VoiceAgentToolDefinition> = new Map();

  /**
   * Register a new tool
   */
  register(tool: VoiceAgentToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
    console.log(`Voice agent tool registered: ${tool.name}`);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    this.tools.delete(name);
    console.log(`Voice agent tool unregistered: ${name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): VoiceAgentToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): VoiceAgentToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found`);
    }

    try {
      return await tool.execute(params);
    } catch (error) {
      console.error(`Error executing tool "${name}":`, error);
      throw error;
    }
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// Export singleton instance
export const voiceAgentToolRegistry = new VoiceAgentToolRegistry();

/**
 * Example tool: Calculator (from LiveAgent)
 * This shows how to structure a tool definition
 */
export const calculatorTool: VoiceAgentToolDefinition = {
  name: 'calculator',
  description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
  parameters: {
    operation: {
      type: 'string',
      description: 'The arithmetic operation to perform',
      enum: ['add', 'subtract', 'multiply', 'divide'],
      required: true,
    },
    a: {
      type: 'number',
      description: 'First number',
      required: true,
    },
    b: {
      type: 'number',
      description: 'Second number',
      required: true,
    },
  },
  execute: async ({ operation, a, b }: { operation: string; a: number; b: number }) => {
    let result: number;

    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          throw new Error('Cannot divide by zero');
        }
        result = a / b;
        break;
      default:
        throw new Error('Invalid operation');
    }

    return {
      operation,
      a,
      b,
      result,
      message: `${a} ${operation} ${b} = ${result}`,
    };
  },
};

/**
 * Register default tools
 */
export function registerDefaultTools() {
  voiceAgentToolRegistry.register(calculatorTool);
}

/**
 * Future tool examples (placeholders for extensibility):
 *
 * - diagramGenerationTool: Generate diagrams from voice commands
 * - projectNavigationTool: Navigate between projects
 * - chatHistoryTool: Query chat history
 * - versionControlTool: Manage diagram versions
 * - fileUploadTool: Process files via voice commands
 */

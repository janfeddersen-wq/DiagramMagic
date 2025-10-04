import { config } from 'dotenv';
import { WorkerOptions, cli, defineAgent, llm, voice } from '@livekit/agents';

// Load .env from backend directory
config({ path: '../backend/.env' });

import { LLM } from '@livekit/agents-plugin-openai';
import { STT } from '@livekit/agents-plugin-deepgram';
import { TTS } from '@livekit/agents-plugin-cartesia';
import { VAD } from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';

// Backend URL for tool calls
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Calculator tool using llm.tool() - proper LiveKit agents-js API
const calculatorTool = llm.tool({
  description: 'Perform basic arithmetic operations (add, subtract, multiply, divide)',
  parameters: {
    type: 'object',
    properties: {
      operation: {
        type: 'string',
        enum: ['add', 'subtract', 'multiply', 'divide'],
        description: 'The arithmetic operation to perform',
      },
      a: {
        type: 'number',
        description: 'First number',
      },
      b: {
        type: 'number',
        description: 'Second number',
      },
    },
    required: ['operation', 'a', 'b'],
  },
  execute: async (args: any) => {
    console.log('🔧🔧🔧 [TOOL] ===== CALCULATOR EXECUTE CALLED =====');
    console.log('🔧 [TOOL] Raw args:', args);
    const { operation, a, b } = args;
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
          return JSON.stringify({ error: 'Cannot divide by zero' });
        }
        result = a / b;
        break;
      default:
        return JSON.stringify({ error: 'Invalid operation' });
    }

    return JSON.stringify({
      operation,
      a,
      b,
      result,
      message: `${a} ${operation} ${b} = ${result}`,
    });
  },
});

// Helper function to call backend with API key
async function callBackendTool(apiKey: string, toolName: string, params: any = {}): Promise<any> {
  console.log(`📡 [BACKEND CALL] Starting call to ${toolName}`);
  console.log(`📡 [BACKEND CALL] URL: ${BACKEND_URL}/api/voice-agent/tool-call`);
  console.log(`📡 [BACKEND CALL] API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`📡 [BACKEND CALL] Params:`, params);

  try {
    const response = await fetch(`${BACKEND_URL}/api/voice-agent/tool-call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        toolName,
        params,
      }),
    });

    console.log(`📡 [BACKEND CALL] Response status:`, response.status);

    if (!response.ok) {
      const error = await response.json();
      console.error(`📡 [BACKEND CALL] Error response:`, error);
      throw new Error(error.error || 'Tool call failed');
    }

    const result = await response.json();
    console.log(`📡 [BACKEND CALL] Success:`, result);
    return result;
  } catch (error) {
    console.error(`📡 [BACKEND CALL] Exception:`, error);
    throw error;
  }
}

// OpenPopover tool factory - creates tool with captured API key
function createOpenPopoverTool(apiKey: string) {
  return llm.tool({
    description: 'Open a popover notification in the user interface to display important information',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Optional message to display in the popover',
        },
      },
    },
    execute: async (args: any) => {
      console.log('🔧🔧🔧 [TOOL] ===== OPENPOPOVER EXECUTE CALLED =====');
      console.log('🔧 [TOOL] Raw args:', args);
      const { message } = args;
      console.log('🔧 [TOOL] OpenPopover called with message:', message);
      console.log('🔧 [TOOL] Using API key:', apiKey.substring(0, 10) + '...');

      try {
        console.log('🔧 [TOOL] Calling backend tool...');
        const result = await callBackendTool(apiKey, 'OpenPopover', { message });
        console.log('🔧 [TOOL] Backend response:', result);

        return JSON.stringify({
          success: true,
          message: 'Popover opened successfully',
        });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}

// Define the agent
export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();

    console.log('✅ Voice Agent connected to room:', ctx.room.name);

    // Wait for user participant to join and get their metadata (contains API key)
    let apiKey = '';

    console.log('🔍 Waiting for user participant to join...');

    // Wait for remote participant (user) to join
    await new Promise<void>((resolve) => {
      const checkParticipants = () => {
        console.log('🔍 Checking participants...');
        console.log('🔍 Remote participants:', Array.from(ctx.room.remoteParticipants.values()).map(p => ({
          identity: p.identity,
          metadata: p.metadata
        })));

        // Check all remote participants for metadata
        for (const participant of ctx.room.remoteParticipants.values()) {
          if (participant.metadata) {
            try {
              console.log('🔍 Found participant with metadata:', participant.identity);
              console.log('🔍 Raw metadata:', participant.metadata);
              const metadata = JSON.parse(participant.metadata);
              apiKey = metadata.apiKey || '';
              if (apiKey) {
                console.log('✅ API key extracted:', apiKey.substring(0, 10) + '...');
                resolve();
                return;
              }
            } catch (e) {
              console.error('❌ Failed to parse participant metadata:', e);
            }
          }
        }
      };

      // Listen for participant join events
      ctx.room.on('participantConnected', (participant: any) => {
        console.log('🔍 Participant connected:', participant.identity);
        setTimeout(checkParticipants, 100); // Small delay to ensure metadata is available
      });

      // Check immediately and also after delays
      checkParticipants();
      setTimeout(checkParticipants, 500);
      setTimeout(checkParticipants, 1000);
      setTimeout(() => {
        if (!apiKey) {
          console.warn('⚠️  No API key found after waiting - resolving anyway');
        }
        resolve();
      }, 2000);
    });

    if (!apiKey) {
      console.warn('⚠️  No API key found in participant metadata - UI tools will not work');
    }

    // Initialize components
    const llmInstance = new LLM({
      model: process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b',
      baseURL: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      toolChoice: 'auto', // Enable automatic tool calling
      parallelToolCalls: false, // Disable parallel tool calls for simpler debugging
    });

    const stt = new STT({
      apiKey: process.env.DEEPGRAM_API_KEY,
    });

    const tts = new TTS({
      apiKey: process.env.CARTESIA_API_KEY,
    });

    const vad = await VAD.load();

    // System instructions
    const instructions = `You are DiagramMagic's AI voice assistant.

    IMPORTANT: You have access to tools that you MUST use when appropriate:
    - calculator: Use this tool for ANY mathematical calculations. DO NOT try to calculate yourself.
    - OpenPopover: Use this tool when the user asks to open a popover, show a notification, or display something in the UI.

    You can also help users with:
    - Answering questions about diagram generation
    - Explaining Mermaid diagram syntax

    CRITICAL: When a user asks you to use a tool (like opening a popover or doing math), you MUST actually call the tool function. Never just say you did something - actually do it by calling the tool.

    Always be friendly and concise in your responses.
    All text you return will be spoken aloud, so don't use bullets or non-pronounceable punctuation.`;

    // Create the voice assistant agent with tools (using llm.tool API)
    const agent = new voice.Agent({
      stt,
      llm: llmInstance,
      tts,
      vad,
      instructions,
      tools: {
        calculator: calculatorTool,
        OpenPopover: createOpenPopoverTool(apiKey),
      },
    });

    // Create and start the agent session
    const session = new voice.AgentSession({
      stt,
      llm: llmInstance,
      tts,
      vad,
    });

    await session.start({
      agent,
      room: ctx.room,
    });

    console.log('✅ Voice Agent session started');
  },
});

// Start the worker if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(import.meta.url),
    })
  );
}

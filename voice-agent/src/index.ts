import { config } from 'dotenv';
import { WorkerOptions, cli, defineAgent, llm, voice } from '@livekit/agents';

// Load .env from backend directory
config({ path: '../backend/.env' });

import { LLM } from '@livekit/agents-plugin-openai';
import { STT } from '@livekit/agents-plugin-deepgram';
import { TTS } from '@livekit/agents-plugin-cartesia';
import { VAD } from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';

// Calculator tool implementation
const calculatorTool: llm.FunctionToolImplementation = {
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
};

// Define the agent
export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();

    console.log('✅ Voice Agent connected to room:', ctx.room.name);

    // Initialize components
    const llmInstance = new LLM({
      model: process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b',
      baseURL: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
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
    You can help users with:
    - Basic calculations using the calculator tool
    - Answering questions about diagram generation
    - Explaining Mermaid diagram syntax

    Always be friendly and concise in your responses.
    All text you return will be spoken aloud, so don't use bullets or non-pronounceable punctuation.`;

    // Create the voice assistant agent
    const agent = new voice.Agent({
      stt,
      llm: llmInstance,
      tts,
      vad,
      instructions,
      fnc_ctx: {
        calculator: calculatorTool,
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

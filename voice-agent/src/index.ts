import { config } from 'dotenv';
import { WorkerOptions, cli, defineAgent, llm, voice } from '@livekit/agents';
import crypto from 'crypto';

// Make crypto available globally (fix for LiveKit SDK bug)
(globalThis as any).crypto = crypto;

// Load .env from backend directory
config({ path: '../backend/.env' });

import { LLM } from '@livekit/agents-plugin-openai';
import { STT } from '@livekit/agents-plugin-deepgram';
import { TTS } from '@livekit/agents-plugin-cartesia';
import { VAD } from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';

// Backend URL for tool calls
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

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
      const errorData = await response.json();
      console.error(`📡 [BACKEND CALL] Error response:`, errorData);
      throw new Error((errorData as any).error || 'Tool call failed');
    }

    const result = await response.json();
    console.log(`📡 [BACKEND CALL] Success:`, result);
    return result;
  } catch (error) {
    console.error(`📡 [BACKEND CALL] Exception:`, error);
    throw error;
  }
}

// UI Control Tools - Factory functions that create tools with captured API key

function createAddProjectTool(apiKey: string) {
  return llm.tool({
    description: 'Create a new project with the specified name',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the new project',
        },
      },
      required: ['name'],
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] AddProject called with:', args);
      const { name } = args;
      try {
        const result = await callBackendTool(apiKey, 'AddProject', { name });
        return JSON.stringify({ success: true, message: `Project "${name}" created successfully` });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createListProjectsTool(apiKey: string) {
  return llm.tool({
    description: 'List all available projects for the user',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] ListProjects called');
      try {
        const result = await callBackendTool(apiKey, 'ListProjects', {});
        // Format projects for the agent to speak
        if (result.projects && result.projects.length > 0) {
          const projectList = result.projects.map((p: any) => `Project ID ${p.id}: ${p.name}`).join('. ');
          return JSON.stringify({
            success: true,
            message: `You have ${result.projects.length} projects: ${projectList}`,
            projects: result.projects
          });
        } else {
          return JSON.stringify({
            success: true,
            message: 'You have no projects yet. Would you like to create one?',
            projects: []
          });
        }
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSelectProjectTool(apiKey: string) {
  return llm.tool({
    description: 'Switch to a specific project by ID or name',
    parameters: {
      type: 'object',
      properties: {
        projectId: {
          type: 'number',
          description: 'The ID of the project to switch to',
        },
      },
      required: ['projectId'],
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] SelectProject called with:', args);
      const { projectId } = args;
      try {
        const result = await callBackendTool(apiKey, 'SelectProject', { projectId });
        return JSON.stringify({ success: true, message: `Switched to project ${projectId}` });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSwitchToScratchModeTool(apiKey: string) {
  return llm.tool({
    description: 'Switch to scratch mode (temporary work without saving to a project)',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] SwitchToScratchMode called');
      try {
        const result = await callBackendTool(apiKey, 'SwitchToScratchMode', {});
        return JSON.stringify({ success: true, message: 'Switched to scratch mode' });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createCreateDiagramTool(apiKey: string) {
  return llm.tool({
    description: 'Create a new diagram in the current project with the specified name',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'The name of the new diagram',
        },
      },
      required: ['name'],
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] CreateDiagram called with:', args);
      const { name } = args;
      try {
        const result = await callBackendTool(apiKey, 'CreateDiagram', { name });
        return JSON.stringify({ success: true, message: `Diagram "${name}" created successfully` });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createTalkToDiagramTool(apiKey: string) {
  return llm.tool({
    description: 'Send a message to the diagram AI chat assistant to generate or modify diagrams',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to the diagram AI',
        },
      },
      required: ['message'],
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] TalkToDiagram called with:', args);
      const { message } = args;
      try {
        const result = await callBackendTool(apiKey, 'TalkToDiagram', { message });
        return JSON.stringify({ success: true, message: 'Message sent to diagram AI' });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createListDiagramsTool(apiKey: string) {
  return llm.tool({
    description: 'List all diagrams in the current project',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] ListDiagrams called');
      try {
        const result = await callBackendTool(apiKey, 'ListDiagrams', {});
        // Format diagrams for the agent to speak
        if (result.diagrams && result.diagrams.length > 0) {
          const diagramList = result.diagrams.map((d: any) => `Diagram ID ${d.id}: ${d.name}`).join('. ');
          return JSON.stringify({
            success: true,
            message: `You have ${result.diagrams.length} diagrams: ${diagramList}`,
            diagrams: result.diagrams
          });
        } else {
          return JSON.stringify({
            success: true,
            message: 'You have no diagrams in this project yet. Would you like to create one?',
            diagrams: []
          });
        }
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSelectDiagramTool(apiKey: string) {
  return llm.tool({
    description: 'Switch to a specific diagram by ID',
    parameters: {
      type: 'object',
      properties: {
        diagramId: {
          type: 'number',
          description: 'The ID of the diagram to switch to',
        },
      },
      required: ['diagramId'],
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] SelectDiagram called with:', args);
      const { diagramId } = args;
      try {
        const result = await callBackendTool(apiKey, 'SelectDiagram', { diagramId });
        return JSON.stringify({ success: true, message: `Switched to diagram ${diagramId}` });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createStopVoiceChatTool(apiKey: string) {
  return llm.tool({
    description: 'Stop the voice chat and close the voice assistant',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      console.log('🔧 [TOOL] StopVoiceChat called');
      try {
        const result = await callBackendTool(apiKey, 'StopVoiceChat', {});
        return JSON.stringify({ success: true, message: 'Goodbye! Voice chat stopped.' });
      } catch (error) {
        console.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
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
    console.log('🤖 Initializing LLM...');
    console.log('🤖 Model:', process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b');
    console.log('🤖 Cerebras API Key:', process.env.CEREBRAS_API_KEY ? 'present' : 'MISSING');

    const llmInstance = new LLM({
      model: process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b',
      baseURL: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      toolChoice: 'auto', // Enable automatic tool calling
      parallelToolCalls: false, // Disable parallel tool calls for simpler debugging
      thinking: false, // Disable thinking tokens
    });

    const stt = new STT({
      apiKey: process.env.DEEPGRAM_API_KEY,
    });

    const tts = new TTS({
      apiKey: process.env.CARTESIA_API_KEY,
    });

    console.log('🔊 TTS initialized with Cartesia');
    console.log('🔊 Cartesia API key:', process.env.CARTESIA_API_KEY ? 'present' : 'missing');

    const vad = await VAD.load();
    console.log('🎤 VAD loaded');

    // System instructions
    const instructions = `You are DiagramMagic's AI voice assistant. You help users control the application using voice commands.

    IMPORTANT: You have access to these UI control tools:
    - AddProject: ONLY when explicitly asked to "create a project" or "add a project"
    - ListProjects: List all projects - use this when user wants to see or switch projects
    - SelectProject: Switch to a project by ID (requires project ID from ListProjects)
    - ListDiagrams: List all diagrams in current project - use when user wants to see or switch diagrams
    - SelectDiagram: Switch to a diagram by ID (requires diagram ID from ListDiagrams)
    - SwitchToScratchMode: ONLY when explicitly asked to "switch to scratch mode"
    - CreateDiagram: ONLY when explicitly asked to "create a diagram" or "add a diagram" (requires diagram name)
    - TalkToDiagram: Use this for EVERYTHING ELSE - any request about creating, modifying, or generating diagrams
    - StopVoiceChat: ONLY when user says "stop", "goodbye", "close voice chat", or "end conversation"

    DEFAULT BEHAVIOR:
    If the user asks about diagrams, flowcharts, sequence diagrams, or any visualization WITHOUT explicitly asking to create/switch projects or diagrams, ALWAYS use TalkToDiagram to send their message to the diagram AI.

    Examples:
    - "Create a flowchart for login" → TalkToDiagram (not CreateDiagram!)
    - "Show me a sequence diagram" → TalkToDiagram
    - "Add error handling to the diagram" → TalkToDiagram
    - "Create a project called MyApp" → AddProject
    - "Create a diagram called UserFlow" → CreateDiagram (explicit diagram creation)

    MULTI-STEP WORKFLOWS (you can call multiple tools in sequence):

    When user says "switch to project X" or "open project X":
    1. First call ListProjects to get available projects and their IDs
    2. Find the project with name matching "X" from the results
    3. Then call SelectProject with that project's ID
    4. Tell the user you've switched to that project

    When user says "switch to diagram X" or "open diagram X":
    1. First call ListDiagrams to get available diagrams in current project
    2. Find the diagram with name matching "X" from the results
    3. Then call SelectDiagram with that diagram's ID
    4. Tell the user you've switched to that diagram

    CRITICAL: When a user asks you to perform an action, you MUST actually call the corresponding tool function. Never just say you did something - actually do it by calling the tool.

    RESPONSE STYLE:
    - Be concise but informative - respond in 1 short sentences
    - Get straight to the point, no pleasantries unless greeting
    - Confirm actions with context: "Switched to project X" or "Created diagram UserFlow"
    - For lists, say the count and give examples: "You have 3 projects: App, Website, and Demo"
    - All text will be spoken aloud, so avoid bullets or special punctuation
    - Never be verbose or chatty
    - Never respond with just a single word - always provide minimal context`;

    // Create the voice assistant agent with tools
    const agent = new voice.Agent({
      stt,
      llm: llmInstance,
      tts,
      vad,
      instructions,
      tools: {
        AddProject: createAddProjectTool(apiKey),
        ListProjects: createListProjectsTool(apiKey),
        SelectProject: createSelectProjectTool(apiKey),
        SwitchToScratchMode: createSwitchToScratchModeTool(apiKey),
        CreateDiagram: createCreateDiagramTool(apiKey),
        ListDiagrams: createListDiagramsTool(apiKey),
        SelectDiagram: createSelectDiagramTool(apiKey),
        TalkToDiagram: createTalkToDiagramTool(apiKey),
        StopVoiceChat: createStopVoiceChatTool(apiKey),
      },
    });

    // Create and start the agent session
    const session = new voice.AgentSession({
      stt,
      llm: llmInstance,
      tts,
      vad,
    });

    // Add event listeners for debugging
    session.on('agent_started_speaking', () => {
      console.log('🗣️  Agent started speaking');
    });

    session.on('agent_stopped_speaking', () => {
      console.log('🤐 Agent stopped speaking');
    });

    session.on('user_started_speaking', () => {
      console.log('👂 User started speaking');
    });

    session.on('user_stopped_speaking', () => {
      console.log('🤫 User stopped speaking');
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
      wsURL: process.env.LIVEKIT_URL,
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
    })
  );
}

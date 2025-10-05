import { config } from 'dotenv';
import { WorkerOptions, cli, defineAgent, llm, voice } from '@livekit/agents';

// Load .env from backend directory
config({ path: '../backend/.env' });

import { LLM } from '@livekit/agents-plugin-openai';
import { STT } from '@livekit/agents-plugin-deepgram';
import { TTS } from '@livekit/agents-plugin-cartesia';
import { VAD } from '@livekit/agents-plugin-silero';
import { fileURLToPath } from 'url';
import { createLogger } from './utils/logger.js';

const logger = createLogger('VoiceAgent');

// Backend URL for tool calls
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Helper function to call backend with API key
async function callBackendTool(apiKey: string, toolName: string, params: any = {}): Promise<any> {
  logger.info(`📡 [BACKEND CALL] Starting call to ${toolName}`);
  logger.info(`📡 [BACKEND CALL] URL: ${BACKEND_URL}/api/voice-agent/tool-call`);
  logger.info(`📡 [BACKEND CALL] API Key: ${apiKey.substring(0, 10)}...`);
  logger.info(`📡 [BACKEND CALL] Params:`, params);

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

    logger.info(`📡 [BACKEND CALL] Response status:`, response.status);

    if (!response.ok) {
      const errorData = await response.json();
      logger.error(`📡 [BACKEND CALL] Error response:`, errorData);
      throw new Error((errorData as any).error || 'Tool call failed');
    }

    const result = await response.json();
    logger.info(`📡 [BACKEND CALL] Success:`, result);
    return result;
  } catch (error) {
    logger.error(`📡 [BACKEND CALL] Exception:`, error);
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
      logger.info('🔧 [TOOL] AddProject called with:', args);
      const { name } = args;
      try {
        const result = await callBackendTool(apiKey, 'AddProject', { name });
        return JSON.stringify({ success: true, message: `Project "${name}" created successfully` });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] ListProjects called');
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
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] SelectProject called with:', args);
      const { projectId } = args;
      try {
        const result = await callBackendTool(apiKey, 'SelectProject', { projectId });
        return JSON.stringify({ success: true, message: `Switched to project ${projectId}` });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] SwitchToScratchMode called');
      try {
        const result = await callBackendTool(apiKey, 'SwitchToScratchMode', {});
        return JSON.stringify({ success: true, message: 'Switched to scratch mode' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] CreateDiagram called with:', args);
      const { name } = args;
      try {
        const result = await callBackendTool(apiKey, 'CreateDiagram', { name });
        return JSON.stringify({ success: true, message: `Diagram "${name}" created successfully` });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] TalkToDiagram called with:', args);
      const { message } = args;
      try {
        const result = await callBackendTool(apiKey, 'TalkToDiagram', { message });
        return JSON.stringify({ success: true, message: 'Message sent to diagram AI' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] ListDiagrams called');
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
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] SelectDiagram called with:', args);
      const { diagramId } = args;
      try {
        const result = await callBackendTool(apiKey, 'SelectDiagram', { diagramId });
        return JSON.stringify({ success: true, message: `Switched to diagram ${diagramId}` });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
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
      logger.info('🔧 [TOOL] StopVoiceChat called');
      try {
        const result = await callBackendTool(apiKey, 'StopVoiceChat', {});
        return JSON.stringify({ success: true, message: 'Goodbye! Voice chat stopped.' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSaveDiagramAsMarkdownTool(apiKey: string) {
  return llm.tool({
    description: 'Save the current diagram as a Markdown file',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] SaveDiagramAsMarkdown called');
      try {
        const result = await callBackendTool(apiKey, 'SaveDiagramAsMarkdown', {});
        return JSON.stringify({ success: true, message: 'Diagram saved as Markdown file' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSaveDiagramAsImageTool(apiKey: string) {
  return llm.tool({
    description: 'Save the current diagram as a PNG image file',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] SaveDiagramAsImage called');
      try {
        const result = await callBackendTool(apiKey, 'SaveDiagramAsImage', {});
        return JSON.stringify({ success: true, message: 'Diagram saved as PNG image' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createOpenHelpTool(apiKey: string) {
  return llm.tool({
    description: 'Open the help/quick start guide modal',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] OpenHelp called');
      try {
        const result = await callBackendTool(apiKey, 'OpenHelp', {});
        return JSON.stringify({ success: true, message: 'Help guide opened' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createCloseHelpTool(apiKey: string) {
  return llm.tool({
    description: 'Close the help/quick start guide modal',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] CloseHelp called');
      try {
        const result = await callBackendTool(apiKey, 'CloseHelp', {});
        return JSON.stringify({ success: true, message: 'Help guide closed' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createGetCurrentDiagramTool(apiKey: string) {
  return llm.tool({
    description: 'Get the current Mermaid diagram code that is visible to the user for discussion and analysis',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] GetCurrentDiagram called');
      try {
        const result = await callBackendTool(apiKey, 'GetCurrentDiagram', {});
        if (result.diagram) {
          return JSON.stringify({
            success: true,
            diagram: result.diagram,
            message: `Here is the current diagram code:\n\n${result.diagram}`
          });
        } else {
          return JSON.stringify({
            success: false,
            message: 'No diagram is currently visible'
          });
        }
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createGetCurrentDiagramVersionTool(apiKey: string) {
  return llm.tool({
    description: 'Get information about the current diagram version (version number and total versions available)',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] GetCurrentDiagramVersion called');
      try {
        const result = await callBackendTool(apiKey, 'GetCurrentDiagramVersion', {});
        if (result.success && result.currentVersion) {
          return JSON.stringify({
            success: true,
            currentVersion: result.currentVersion,
            totalVersions: result.totalVersions,
            message: `Currently on version ${result.currentVersion} of ${result.totalVersions}`
          });
        } else {
          return JSON.stringify({
            success: false,
            message: result.message || 'No diagram version information available'
          });
        }
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createSelectDiagramVersionTool(apiKey: string) {
  return llm.tool({
    description: 'Select a specific diagram version by version number',
    parameters: {
      type: 'object',
      properties: {
        versionNumber: {
          type: 'number',
          description: 'The version number to switch to',
        },
      },
      required: ['versionNumber'],
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] SelectDiagramVersion called with:', args);
      const { versionNumber } = args;
      try {
        const result = await callBackendTool(apiKey, 'SelectDiagramVersion', { versionNumber });
        if (result.success) {
          return JSON.stringify({
            success: true,
            message: `Switched to version ${versionNumber}`
          });
        } else {
          return JSON.stringify({
            success: false,
            message: result.message || `Version ${versionNumber} not found`
          });
        }
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

function createShowVersionHistoryTool(apiKey: string) {
  return llm.tool({
    description: 'Open/show the version history panel',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async (args: any) => {
      logger.info('🔧 [TOOL] ShowVersionHistory called');
      try {
        const result = await callBackendTool(apiKey, 'ShowVersionHistory', {});
        return JSON.stringify({ success: true, message: 'Version history opened' });
      } catch (error) {
        logger.error('🔧 [TOOL] Error:', error);
        return JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    },
  });
}

// Define the agent
export default defineAgent({
  entry: async (ctx) => {
    await ctx.connect();

    logger.info('✅ Voice Agent connected to room:', ctx.room.name);

    // Wait for user participant to join and get their metadata (contains API key)
    let apiKey = '';

    logger.info('🔍 Waiting for user participant to join...');

    // Wait for remote participant (user) to join
    await new Promise<void>((resolve) => {
      const checkParticipants = () => {
        logger.info('🔍 Checking participants...');
        logger.info('🔍 Remote participants:', Array.from(ctx.room.remoteParticipants.values()).map(p => ({
          identity: p.identity,
          metadata: p.metadata
        })));

        // Check all remote participants for metadata
        for (const participant of ctx.room.remoteParticipants.values()) {
          if (participant.metadata) {
            try {
              logger.info('🔍 Found participant with metadata:', participant.identity);
              logger.info('🔍 Raw metadata:', participant.metadata);
              const metadata = JSON.parse(participant.metadata);
              apiKey = metadata.apiKey || '';
              if (apiKey) {
                logger.info('✅ API key extracted:', apiKey.substring(0, 10) + '...');
                resolve();
                return;
              }
            } catch (e) {
              logger.error('❌ Failed to parse participant metadata:', e);
            }
          }
        }
      };

      // Listen for participant join events
      ctx.room.on('participantConnected', (participant: any) => {
        logger.info('🔍 Participant connected:', participant.identity);
        setTimeout(checkParticipants, 100); // Small delay to ensure metadata is available
      });

      // Check immediately and also after delays
      checkParticipants();
      setTimeout(checkParticipants, 500);
      setTimeout(checkParticipants, 1000);
      setTimeout(() => {
        if (!apiKey) {
          logger.warn('⚠️  No API key found after waiting - resolving anyway');
        }
        resolve();
      }, 2000);
    });

    if (!apiKey) {
      logger.warn('⚠️  No API key found in participant metadata - UI tools will not work');
    }

    // Initialize components
    logger.info('🤖 Initializing LLM...');
    logger.info('🤖 Model:', process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b');
    logger.info('🤖 Cerebras API Key:', process.env.CEREBRAS_API_KEY ? 'present' : 'MISSING');

    const llmInstance = new LLM({
      model: process.env.VOICE_AGENT_MODEL || 'llama-3.3-70b',
      baseURL: 'https://api.cerebras.ai/v1',
      apiKey: process.env.CEREBRAS_API_KEY,
      toolChoice: 'auto',
      parallelToolCalls: false,
    });

    logger.info('✅ LLM initialized');

    const stt = new STT({
      apiKey: process.env.DEEPGRAM_API_KEY,
      model: 'nova-2',
      language: 'en',
    });

    // Add STT event listeners for debugging
    stt.on('metrics_collected', (metrics: any) => {
      logger.debug('📊 STT metrics:', JSON.stringify(metrics));
    });

    stt.on('error', (error: any) => {
      logger.error('❌ STT error:', error);
    });

    logger.info('🎤 STT initialized with Deepgram');
    logger.info('🎤 Deepgram API key:', process.env.DEEPGRAM_API_KEY ? 'present' : 'missing');

    const tts = new TTS({
      apiKey: process.env.CARTESIA_API_KEY,
    });

    logger.info('🔊 TTS initialized with Cartesia');
    logger.info('🔊 Cartesia API key:', process.env.CARTESIA_API_KEY ? 'present' : 'missing');

    const vad = await VAD.load();
    logger.info('🎤 VAD loaded');

    // System instructions
    const instructions = `You are DiagramMagic's AI voice assistant. You help users control the application using voice commands.

    YOUR PRIMARY TOOL IS TalkToDiagram - this is your main way to create and modify diagrams. Use it by default for ANY diagram-related request.

    TOOL REFERENCE:
    - TalkToDiagram: **YOUR PRIMARY TOOL** - Use this for creating diagrams, modifying diagrams, generating any visualization. This sends the user's request to the diagram AI which will generate the Mermaid code.
    - CreateDiagram: ONLY for creating an empty named diagram placeholder in a project (rare use case)
    - AddProject: ONLY when explicitly asked to "create a project" or "add a project"
    - ListProjects: List all projects when user wants to see or switch projects
    - SelectProject: Switch to a project by ID (requires project ID from ListProjects)
    - ListDiagrams: List all diagrams in current project
    - SelectDiagram: Switch to a diagram by ID (requires diagram ID from ListDiagrams)
    - SwitchToScratchMode: ONLY when explicitly asked to "switch to scratch mode"
    - GetCurrentDiagram: Retrieve the current visible Mermaid diagram code to discuss or analyze it
    - GetCurrentDiagramVersion: Get current version number and total versions available
    - SelectDiagramVersion: Switch to a specific version by version number
    - ShowVersionHistory: Open the version history panel
    - SaveDiagramAsMarkdown: Save current diagram as a Markdown (.md) file
    - SaveDiagramAsImage: Save current diagram as a PNG image file
    - OpenHelp: Open the help/quick start guide modal
    - CloseHelp: Close the help/quick start guide modal
    - StopVoiceChat: ONLY when user says "stop", "goodbye", "close voice chat", or "end conversation"

    CRITICAL RULES:
    1. If user wants to CREATE A NAMED DIAGRAM in a project (e.g., "create a diagram called X") → use CreateDiagram with the name
    2. If user wants to GENERATE DIAGRAM CONTENT or describes what they want (e.g., "create a flowchart showing login") → use TalkToDiagram
    3. If user says both name AND content (e.g., "create a diagram called UserFlow showing authentication") → First CreateDiagram("UserFlow"), then TalkToDiagram("create a flowchart showing authentication")
    4. ANY request to modify, update, change a diagram → ALWAYS use TalkToDiagram
    5. NEVER answer diagram modification requests yourself - ALWAYS route them to TalkToDiagram
    6. DO NOT discuss or explain how to modify diagrams - just call TalkToDiagram with the user's exact request

    DIAGRAM MODIFICATION PATTERNS (ALL use TalkToDiagram):
    - "change X to Y" → TalkToDiagram("change X to Y")
    - "make X bigger/smaller" → TalkToDiagram("make X bigger/smaller")
    - "update value from A to B" → TalkToDiagram("update value from A to B")
    - "increase/decrease X" → TalkToDiagram("increase/decrease X")
    - "set X to Y" → TalkToDiagram("set X to Y")
    - "add X to the diagram" → TalkToDiagram("add X to the diagram")
    - "remove X from the diagram" → TalkToDiagram("remove X from the diagram")
    - "replace X with Y" → TalkToDiagram("replace X with Y")
    - "make X 5 times bigger" → TalkToDiagram("make X 5 times bigger")
    - "change the value from D to 5" → TalkToDiagram("change the value from D to 5")

    Examples:
    - "Create a new diagram called super duper test" → CreateDiagram("super duper test")
    - "Create a diagram named UserFlow" → CreateDiagram("UserFlow")
    - "Create a flowchart for login" → TalkToDiagram("Create a flowchart for login")
    - "Show me a sequence diagram" → TalkToDiagram("Show me a sequence diagram")
    - "Make a diagram called UserFlow showing authentication" → CreateDiagram("UserFlow"), then TalkToDiagram("create a flowchart showing authentication")
    - "Create a class diagram with User and Order classes" → TalkToDiagram("Create a class diagram with User and Order classes")
    - "Add error handling to the diagram" → TalkToDiagram("Add error handling to the diagram")
    - "Change the value from D to 5" → TalkToDiagram("Change the value from D to 5")
    - "Make X 5 times bigger" → TalkToDiagram("Make X 5 times bigger")
    - "Update the flowchart to include validation" → TalkToDiagram("Update the flowchart to include validation")
    - "Set the bar for January to 100" → TalkToDiagram("Set the bar for January to 100")
    - "Create a project called MyApp" → AddProject("MyApp")
    - "What's in the current diagram?" → GetCurrentDiagram (then discuss the code)
    - "Explain this diagram to me" → GetCurrentDiagram (then explain the retrieved code)
    - "Can you improve the diagram?" → GetCurrentDiagram (get it first, then suggest improvements via TalkToDiagram)
    - "Go back one version" → GetCurrentDiagramVersion, then SelectDiagramVersion(currentVersion - 1)
    - "Go to next version" → GetCurrentDiagramVersion, then SelectDiagramVersion(currentVersion + 1)
    - "Show version history" → ShowVersionHistory
    - "What version am I on?" → GetCurrentDiagramVersion
    - "Go to version 3" → SelectDiagramVersion(3)
    - "Save diagram as markdown" → SaveDiagramAsMarkdown
    - "Download as image" → SaveDiagramAsImage
    - "Export as PNG" → SaveDiagramAsImage
    - "Show help" → OpenHelp
    - "Open guide" → OpenHelp
    - "Close help" → CloseHelp

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
        GetCurrentDiagram: createGetCurrentDiagramTool(apiKey),
        GetCurrentDiagramVersion: createGetCurrentDiagramVersionTool(apiKey),
        SelectDiagramVersion: createSelectDiagramVersionTool(apiKey),
        ShowVersionHistory: createShowVersionHistoryTool(apiKey),
        SaveDiagramAsMarkdown: createSaveDiagramAsMarkdownTool(apiKey),
        SaveDiagramAsImage: createSaveDiagramAsImageTool(apiKey),
        OpenHelp: createOpenHelpTool(apiKey),
        CloseHelp: createCloseHelpTool(apiKey),
        StopVoiceChat: createStopVoiceChatTool(apiKey),
      },
    });

    logger.info('🤖 Agent created with tools:', Object.keys(agent.tools || {}).join(', '));

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

    logger.info('✅ Voice Agent session started');

    // Add event listeners for debugging
    session.on('agent_started_speaking', () => {
      logger.debug('🗣️  Agent started speaking');
    });

    session.on('agent_stopped_speaking', () => {
      logger.debug('🤐 Agent stopped speaking');
    });

    session.on('user_started_speaking', () => {
      logger.debug('👂 User started speaking');
    });

    session.on('user_stopped_speaking', () => {
      logger.debug('🤫 User stopped speaking');
    });

    session.on('user_speech_committed', (msg: any) => {
      logger.info('💬 User speech committed - text length:', msg?.text?.length || 0);
      logger.info('💬 User speech text:', msg?.text || '(empty)');
      logger.debug('💬 Full message:', JSON.stringify(msg));
    });

    // Try to catch all session events
    const originalEmit = session.emit.bind(session);
    session.emit = function(event: any, ...args: any[]) {
      if (event.toString().includes('speech') || event.toString().includes('transcript')) {
        logger.debug('📡 Session event:', event.toString(), 'args:', JSON.stringify(args).slice(0, 200));
      }
      return originalEmit(event, ...args);
    };

    // Add more detailed debugging events
    session.on('function_calls_collected', (calls: any) => {
      logger.info('🔧 Function calls collected:', JSON.stringify(calls));
    });

    session.on('function_calls_finished', (result: any) => {
      logger.info('✅ Function calls finished:', JSON.stringify(result));
    });

    // Add LLM debugging
    llmInstance.on('metrics_collected', (metrics: any) => {
      logger.debug('📊 LLM metrics:', JSON.stringify(metrics));
    });

    llmInstance.on('error', (error: any) => {
      logger.error('❌ LLM error:', error);
      logger.error('❌ LLM error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    });
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

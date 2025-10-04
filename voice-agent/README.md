# Voice Agent Microservice

AI-powered voice assistant for DiagramMagic, built with LiveKit and Cerebras.

## Overview

The Voice Agent microservice provides real-time voice interaction capabilities to DiagramMagic. It uses:

- **LiveKit** for real-time audio streaming
- **Cerebras** for fast AI inference
- **Deepgram** for speech-to-text
- **Cartesia** for text-to-speech
- **Silero VAD** for voice activity detection

## Architecture

The service consists of two components:

1. **HTTP Server** (`src/server.ts`) - Port 3002
   - Generates LiveKit access tokens
   - Health check endpoint

2. **Voice Agent Worker** (`src/index.ts`)
   - Processes voice conversations
   - Executes tools (calculator, future diagram tools)
   - Manages AI conversations

## Configuration

Environment variables are read from `backend/.env`:

```bash
# Voice Agent Configuration
VOICE_AGENT_PORT=3002
VOICE_AGENT_MODEL=llama-3.3-70b

# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud

# AI Services
CEREBRAS_API_KEY=your_cerebras_key
DEEPGRAM_API_KEY=your_deepgram_key
CARTESIA_API_KEY=your_cartesia_key
```

## Running the Service

### Via manage.sh (recommended)

```bash
# Start all services including voice agent
./manage.sh start

# Start only voice agent
./manage.sh start-voice-agent

# Stop voice agent
./manage.sh stop-voice-agent

# View status
./manage.sh status
```

### Standalone

```bash
# Install dependencies
npm install

# Start HTTP server (token generation)
npm run server

# Start voice agent worker (in another terminal)
npm run dev
```

## Development

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Adding Tools

Tools are defined in `src/index.ts`. To add a new tool:

```typescript
const myTool: llm.FunctionToolImplementation = {
  description: 'Tool description',
  parameters: {
    type: 'object',
    properties: {
      param: {
        type: 'string',
        description: 'Parameter description',
      },
    },
    required: ['param'],
  },
  execute: async ({ param }: { param: string }) => {
    // Tool logic
    return JSON.stringify({ result: 'value' });
  },
};

// Register in agent
const agent = new voice.Agent({
  // ... other config
  fnc_ctx: {
    calculator: calculatorTool,
    myTool: myTool, // Add here
  },
});
```

## Integration with Frontend

The frontend connects via the VoiceAgentButton component:

1. User clicks the headset button
2. Frontend fetches token from `http://localhost:3002/token`
3. LiveKit connection established
4. Voice agent worker processes conversations

## Future Enhancements

- **Diagram Generation Tool**: Voice commands to create diagrams
- **Project Navigation Tool**: Switch projects via voice
- **Chat History Tool**: Query conversation history
- **Version Control Tool**: Manage diagram versions

## Ports

- **3001**: DiagramMagic Backend
- **3002**: Voice Agent HTTP Server (this service)
- **3000**: DiagramMagic Frontend

## Logs

Logs are written to `logs/voice-agent.log` when managed by `manage.sh`.

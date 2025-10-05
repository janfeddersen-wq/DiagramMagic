# DiagramMagic ✨

AI-powered Mermaid diagram generator with intelligent chat interface and visual editing capabilities.

![DiagramMagic](https://img.shields.io/badge/AI-Powered-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Core Capabilities
- 🎙️ **Voice Assistant**: Complete hands-free application control for people with Disabilities.
- 🤖 **ReAct AI Agent**: Intelligent diagram generation with self-validation and error correction
- ⚡ **Lightning Fast**: Powered by [Cerebras](https://cerebras.ai/) for ultra-fast AI inference
- 🔍 **Image to Mermaid**: Convert diagrams from images using [Meta Llama 4 Scout](https://openrouter.ai/meta-llama/llama-4-scout) via OpenRouter (or Gemini 2.5 Flash)
- 💬 **Context-aware Chat**: Maintains conversation history for iterative diagram refinement
- ✅ **Auto-validation**: Validates and fixes Mermaid syntax automatically
- 🎨 **Split-view UI**: Live diagram preview with interactive chat interface

### User Experience
- 🎙️ **Voice Assistant**: Complete hands-free application control with natural language voice commands
- 📸 **Paste Images**: Copy & paste diagrams directly into chat (Ctrl+V / Cmd+V)
- 📄 **Document Support**: Upload Word docs, Excel files, or CSV for data-driven diagrams
- 🎤 **Speech-to-Text**: Convert audio recordings to text prompts (via Gemini)
- 🖼️ **Export Options**: Download as Markdown or high-quality PNG images
- 🔍 **Pan & Zoom**: Interactive diagram navigation with zoom controls
- 🎯 **Quick Start**: Built-in example prompts and comprehensive help guide
- 🎨 **Draw.io Integration**: Export to Draw.io for full visual editing
- 👤 **User Authentication**: Secure signup/login system with JWT tokens

### Project Management
- 📁 **Projects & Organization**: Organize diagrams into projects with full CRUD operations
- 📊 **Multiple Diagrams**: Create and manage multiple diagrams per project
- 🕐 **Version History**: Track all diagram versions with rollback capability
- 💬 **Per-Diagram Chat**: Dedicated chat history for each diagram
- 🎯 **Scratch Mode**: Quick prototyping without project constraints
- 🗂️ **Persistent Storage**: SQLite database with Kysely query builder

### Technical Features
- 📝 **GitHub Flavored Markdown**: Full GFM support including tables in chat
- 🔄 **Real-time Validation**: Socket.io-based diagram validation
- 🧹 **Clean State**: Clear chat and diagram for fresh starts
- 📊 **Multiple Diagram Types**: Flowcharts, sequence diagrams, Gantt charts, ER diagrams, and more
- 📋 **Structured Logging**: Winston logger for backend/voice-agent, custom logger for frontend
- ⌨️ **Keyboard Shortcuts**: Ctrl+K/Cmd+K to toggle voice assistant

## 🏗️ Architecture

```
DiagramMagic/
├── backend/                    # Express.js + TypeScript Backend
│   └── src/
│       ├── controllers/        # API route handlers
│       │   ├── diagramController.ts    # Diagram generation (legacy)
│       │   ├── diagramsController.ts   # Diagram CRUD operations
│       │   ├── projectsController.ts   # Project management
│       │   ├── authController.ts       # User authentication
│       │   └── fileController.ts       # File uploads & conversion
│       ├── services/
│       │   ├── reactAgent.ts           # ReAct AI agent (Cerebras)
│       │   ├── geminiService.ts        # Gemini image/speech processing
│       │   └── openRouterService.ts    # OpenRouter (Llama Scout)
│       ├── database/
│       │   ├── schema.ts               # Database TypeScript types
│       │   ├── connection.ts           # SQLite connection
│       │   └── migrations.ts           # Schema creation
│       ├── middleware/
│       │   └── auth.ts                 # JWT authentication
│       ├── utils/
│       │   ├── fileConverters.ts       # Document parsing
│       │   ├── auth.ts                 # Token utilities
│       │   └── logger.ts               # Winston logger
│       └── types/                      # TypeScript definitions
│
├── frontend/                   # React + TypeScript Frontend
│   └── src/
│       ├── components/         # UI components
│       │   ├── MermaidDiagram.tsx      # Diagram renderer
│       │   ├── ChatPanel.tsx           # Chat interface
│       │   ├── FileUpload.tsx          # File handling
│       │   ├── ProjectSelector.tsx     # Project dropdown
│       │   ├── DiagramsSidebar.tsx     # Diagrams list
│       │   ├── DiagramVersionHistory.tsx # Version selector
│       │   ├── VoiceAgentModal.tsx     # Voice assistant UI
│       │   ├── LoginModal.tsx          # Login form
│       │   ├── SignupModal.tsx         # Signup form
│       │   └── WelcomePage.tsx         # Landing page
│       ├── hooks/              # Custom React hooks
│       │   ├── useAuth.ts              # Authentication state
│       │   ├── useProject.ts           # Project state
│       │   ├── useDiagram.ts           # Diagram state
│       │   ├── useChat.ts              # Chat state
│       │   └── useVoiceAgent.ts        # Voice agent state
│       ├── contexts/
│       │   └── AuthContext.tsx         # Global auth context
│       ├── services/           # API clients
│       │   ├── api.ts                  # Diagram API
│       │   ├── projectsApi.ts          # Projects API
│       │   └── voiceAgentTools.ts      # Voice agent integration
│       ├── utils/
│       │   └── logger.ts               # Custom browser logger
│       └── styles/             # Tailwind CSS
│
└── voice-agent/                # LiveKit Voice Agent
    └── src/
        ├── index.ts            # Voice agent logic
        ├── server.ts           # Token generation server
        └── utils/
            └── logger.ts       # Winston logger
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Cerebras API Key** (Required) - [Get one here](https://cloud.cerebras.ai/)
- **LiveKit Account** (Required for voice assistant) - [Get one here](https://livekit.io/)
- **Deepgram API Key** (Required for voice assistant) - [Get one here](https://deepgram.com/)
- **Cartesia API Key** (Required for voice assistant) - [Get one here](https://cartesia.ai/)
- **OpenRouter API Key** (Optional - for image conversion with Llama Scout) - [Get one here](https://openrouter.ai/)
- **Gemini API Key** (Optional - for image/speech processing) - [Get one here](https://makersuite.google.com/app/apikey)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/janfeddersen-wq/DiagramMagic.git
   cd DiagramMagic
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env and add your API keys
   npm run dev
   ```

3. **Frontend Setup** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Voice Agent Setup** (optional, in a new terminal)
   ```bash
   cd voice-agent
   npm install
   # Uses same .env as backend
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory (shared with voice-agent):

```bash
# Required: Cerebras API for fast AI inference
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=llama3.1-8b

# Voice Agent Configuration (Optional)
VOICE_AGENT_MODEL=llama-3.3-70b
LIVEKIT_URL=wss://your-livekit-url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
DEEPGRAM_API_KEY=your_deepgram_api_key
CARTESIA_API_KEY=your_cartesia_api_key
VOICE_AGENT_PORT=3002

# Image to Mermaid Service
# Choose: 'gemini' or 'openrouter'
IMAGE_SERVICE=openrouter

# OpenRouter Configuration (Meta Llama 4 Scout - Free!)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-4-scout:free

# Gemini Configuration (Optional - for images and speech)
GEMINI_API_KEY=your_gemini_api_key_here
SPEECH_SERVICE=gemini

# Authentication
JWT_SECRET=your_secret_key_here

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000

# Logging (Optional)
LOG_LEVEL=debug  # debug, info, warn, error
```

### Image Service Options

**Meta Llama 4 Scout** (Recommended - Free tier available)
- Fast and accurate diagram recognition
- Optimized for visual understanding
- Available via OpenRouter

**Gemini 2.5 Flash** (Alternative)
- Google's multimodal AI
- Excellent for complex diagrams
- Requires Google AI API key

## 📖 Usage Guide

### Getting Started

1. **Create an Account** or use **Scratch Mode** for quick prototyping
2. **Create a Project** to organize your diagrams
3. **Start a Diagram** and chat with the AI
4. **Use Voice Commands** (Ctrl+K / Cmd+K) for hands-free control

### Creating Diagrams with Chat

1. **Simple Prompt**
   ```
   Create a flowchart for user authentication
   ```

2. **Complex Request**
   ```
   Generate a sequence diagram showing the OAuth2 flow
   between client, authorization server, and resource server
   ```

3. **Iterative Refinement**
   ```
   Add error handling to the flowchart
   Change the colors to be more professional
   ```

### Using the Voice Assistant

Press **Ctrl+K** (or **Cmd+K** on Mac) to activate the voice assistant:

**Example Voice Commands:**
- "What projects do we have?"
- "Create a project named MyApp"
- "Select project MyApp"
- "Create a flowchart for user login"
- "List all diagrams"
- "Switch to diagram UserFlow"
- "Create a mindmap for marketing strategy"
- "Goodbye chat" (to close voice assistant)

**Voice Assistant Features:**
- Complete hands-free navigation
- Project and diagram management
- Direct diagram generation
- Natural language understanding
- Automatic UI synchronization

### Image to Diagram Conversion

1. **Upload Method**: Click the attachment icon and select an image
2. **Paste Method**: Copy an image and paste directly into chat (Ctrl+V / Cmd+V)
3. **AI Processing**: Image is converted to Mermaid using Meta Llama 4 Scout
4. **Validation**: Diagram code is validated and fixed by the ReAct agent

### Document Processing

**Supported Formats**:
- **Word Documents** (.docx): Text extraction for diagram generation
- **Excel/CSV** (.xlsx, .xls, .csv): Data-driven charts and diagrams
- **Images** (.png, .jpg, .jpeg, .gif, .webp): Visual diagram conversion
- **Audio** (.mp3, .wav, .ogg, .m4a, .webm): Speech-to-text for prompts

### Project Management

**Projects**
- Create unlimited projects to organize diagrams
- Each project contains multiple diagrams
- Project-scoped chat history
- Full CRUD operations (Create, Read, Update, Delete)

**Diagrams**
- Multiple diagrams per project
- Automatic version tracking for every change
- Switch between diagram versions easily
- Per-diagram chat history for context
- Export individual diagrams

**Scratch Mode**
- Quick prototyping without saving
- No login required
- Perfect for one-off diagrams

### Visual Editing with Draw.io

1. Download diagram as Markdown (click download icon)
2. Go to [app.diagrams.net](https://app.diagrams.net)
3. Click **Arrange** → **Insert** → **Advanced** → **Mermaid**
4. Paste your Mermaid code
5. Edit visually with drag-and-drop

## 🎯 Example Prompts

### Project Management
- "Create a Gantt chart for a website development project"
- "Generate a project timeline with milestones"
- "Show a task dependency diagram"

### Software Architecture
- "Create a sequence diagram for user authentication"
- "Generate a class diagram for an e-commerce system"
- "Show a microservices architecture diagram"

### Workflows & Processes
- "Create a flowchart for order processing"
- "Generate a state diagram for user registration"
- "Show an ER diagram for a blog database"

### Data & Analytics
- "Create a pie chart showing sales distribution"
- "Generate a bar chart comparing quarterly revenue"
- "Show a mindmap of marketing strategies"

## 🔌 API Reference

### Authentication

**Signup**
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "name": "User Name"
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

### Projects

**List Projects**
```http
GET /api/projects
Authorization: Bearer <token>
```

**Create Project**
```http
POST /api/projects
Authorization: Bearer <token>

{
  "name": "My Project",
  "description": "Project description"
}
```

### Diagrams

**List Diagrams**
```http
GET /api/projects/:projectId/diagrams
Authorization: Bearer <token>
```

**Create Diagram**
```http
POST /api/projects/:projectId/diagrams
Authorization: Bearer <token>

{
  "name": "My Diagram",
  "mermaidCode": "graph TD..."
}
```

**Get Diagram Versions**
```http
GET /api/diagrams/:id/versions
Authorization: Bearer <token>
```

### Generate Diagram
```http
POST /api/generate
Content-Type: application/json

{
  "prompt": "Create a flowchart for login",
  "chatHistory": [...],
  "currentDiagram": "graph TD...",
  "diagramId": 123  // optional
}
```

**Response:**
```json
{
  "success": true,
  "chatAnswer": "I've created a flowchart...",
  "mermaidDiagram": "graph TD\n  A[Start]..."
}
```

### Upload File
```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "type": "image",
  "diagram": "graph TD...",
  "description": "Login flow diagram"
}
```

### Transcribe Audio
```http
POST /api/transcribe
Content-Type: multipart/form-data

audio: <binary>
```

**Response:**
```json
{
  "transcript": "Create a flowchart showing..."
}
```

### Voice Agent Token
```http
POST /voice-agent/token
Content-Type: application/json

{
  "roomName": "optional-room-name",
  "participantName": "optional-participant-name"
}
```

### Health Check
```http
GET /api/health
```

## 🛠️ Tech Stack

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Socket.io** - Real-time validation
- **SQLite** - Embedded database
- **Kysely** - Type-safe SQL query builder
- **bcrypt** - Password hashing
- **jsonwebtoken** - JWT authentication
- **OpenAI SDK** - Compatible with Cerebras & OpenRouter
- **Mermaid** - Diagram validation
- **Multer** - File uploads
- **Mammoth** - Word document parsing
- **XLSX** - Excel parsing
- **Winston** - Structured logging

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Mermaid** - Diagram rendering
- **React Markdown** - Markdown rendering with GFM
- **remark-gfm** - GitHub Flavored Markdown
- **Panzoom** - Interactive diagram controls
- **Socket.io Client** - Real-time updates
- **LiveKit Components** - Voice assistant UI

### Voice Agent
- **LiveKit Agents SDK** - Voice agent framework
- **Deepgram** - Speech-to-text (STT)
- **Cartesia** - Text-to-speech (TTS)
- **Silero VAD** - Voice activity detection
- **OpenAI SDK** - LLM integration (Cerebras)
- **Winston** - Structured logging

### AI Services
- **Cerebras** - Ultra-fast LLM inference (main agent & voice)
- **Meta Llama 4 Scout** - Image to diagram (via OpenRouter)
- **Gemini 2.5 Flash** - Alternative image & speech processing
- **Deepgram Nova 2** - Voice transcription
- **Cartesia** - Natural voice synthesis

## 📊 Supported Diagram Types

- **Flowcharts** - Process flows and decision trees
- **Sequence Diagrams** - Interactions and message flows
- **Class Diagrams** - Object-oriented structures
- **State Diagrams** - State machines and transitions
- **Entity Relationship** - Database schemas
- **Gantt Charts** - Project timelines
- **Pie Charts** - Data distribution
- **Git Graphs** - Version control flows
- **Mindmaps** - Hierarchical concepts
- **Journey Diagrams** - User journeys
- **And more!** - All Mermaid diagram types

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Cerebras** for providing lightning-fast AI inference
- **Meta** for the Llama 4 Scout vision model
- **OpenRouter** for unified AI model access
- **LiveKit** for the real-time voice infrastructure
- **Deepgram** for exceptional speech-to-text quality
- **Cartesia** for natural text-to-speech synthesis
- **Mermaid** for the amazing diagramming syntax
- **Draw.io** for visual diagram editing capabilities

## 🐛 Troubleshooting

### Common Issues

**Diagram not rendering?**
- Check browser console for errors
- Verify Mermaid syntax is valid
- Try clearing chat and starting fresh

**Image upload failing?**
- Ensure IMAGE_SERVICE is configured in .env
- Check API key is valid
- Verify image is under 10MB

**Voice assistant not working?**
- Verify all voice agent API keys are set (LiveKit, Deepgram, Cartesia)
- Check that voice-agent server is running on port 3002
- Ensure microphone permissions are granted
- Check browser console for WebRTC errors

**Authentication issues?**
- Verify JWT_SECRET is set in .env
- Clear browser localStorage and try again
- Check backend logs for authentication errors

**Database errors?**
- Delete `backend/database.sqlite` to reset (will lose data)
- Check file permissions on database file
- Verify migrations ran successfully

**Slow response times?**
- Cerebras should be very fast - check API key
- Verify network connection
- Check backend logs for errors
- Review LOG_LEVEL setting (set to 'info' for production)

## 📧 Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/janfeddersen-wq/DiagramMagic/issues)
- Check existing documentation
- Review example prompts in the app

## KNOWN ISSUES
- Draw.io does not cleanly accept certain types or mermaid diagrams .... have to debug draw.io for that. Flowchart is fine Documentation says its fine (https://github.com/jgraph/drawio/issues/5290)

# DiagramAI

AI-powered Mermaid diagram generator with React/Tailwind frontend and ReAct AI Agent backend.

## Features

- 🤖 **ReAct AI Agent**: Intelligent diagram generation with self-validation and error correction
- 🎨 **Split-view UI**: Live Mermaid diagram preview (left) and chat interface (right)
- 💬 **Context-aware**: Sends last 5 messages and current diagram for better responses
- ✅ **Automatic validation**: Validates Mermaid syntax and fixes errors automatically
- 📊 **Structured responses**: Separates chat answers from diagram code
- 🚀 **Powered by Cerebras**: Fast AI inference using Cerebras API

## Architecture

```
DiagramAI/
├── backend/              # Express backend with ReAct Agent
│   └── src/
│       ├── controllers/  # API controllers
│       ├── services/     # ReAct Agent logic
│       ├── utils/        # Mermaid validator
│       └── types/        # TypeScript types
└── frontend/            # React + Tailwind frontend
    └── src/
        ├── components/  # UI components
        ├── hooks/       # React hooks
        ├── services/    # API client
        └── types/       # TypeScript types
```

## Setup

### Prerequisites

- Node.js 18+
- Cerebras API key

### Backend Setup

1. Navigate to backend:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your Cerebras API key to `.env`:
   ```
   CEREBRAS_API_KEY=your_api_key_here
   PORT=3001
   ```

5. Start the backend:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to frontend:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the frontend:
   ```bash
   npm run dev
   ```

4. Open http://localhost:3000 in your browser

## Usage

1. Start both backend and frontend servers
2. Open the application in your browser
3. Type a request like "Create a flowchart for a user login process"
4. The AI will generate a Mermaid diagram and validate it automatically
5. Continue the conversation to refine or modify the diagram

## API Endpoints

- `POST /api/generate` - Generate/modify diagram
  - Body: `{ prompt: string, chatHistory: ChatMessage[], currentDiagram?: string }`
  - Response: `{ chatAnswer: string, mermaidDiagram: string, success: boolean }`

- `GET /api/health` - Health check

## Tech Stack

### Backend
- Express.js
- TypeScript
- OpenAI SDK (Cerebras compatible)
- Mermaid (for validation)
- JSDOM (for server-side rendering)

### Frontend
- React 18
- TypeScript
- Tailwind CSS
- Vite
- Mermaid
- React Markdown
- Axios

## License

MIT

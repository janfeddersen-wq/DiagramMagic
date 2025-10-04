# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DiagramMagic is an AI-powered Mermaid diagram generator with React frontend and Express.js backend. It uses a ReAct AI agent (powered by Cerebras) for intelligent diagram generation with automatic syntax validation and error correction. Features include image-to-diagram conversion, real-time validation via Socket.IO, project management, and version control for diagrams.

## Development Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev             # Development server with hot reload (tsx watch)
npm run build           # Compile TypeScript to dist/
npm start               # Run production build
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Vite dev server (usually http://localhost:3000)
npm run build           # Build for production (TypeScript + Vite)
npm run preview         # Preview production build
```

### Running Both
Start backend and frontend in separate terminals. Backend runs on port 3001 (configurable via PORT env var), frontend on port 3000 (Vite default).

## Environment Configuration

Backend requires `.env` file (see `backend/.env.example`):
- **CEREBRAS_API_KEY** (required): Main AI agent for diagram generation
- **CEREBRAS_MODEL** (optional): Default is `llama3.1-8b`
- **IMAGE_SERVICE**: Choose `gemini` or `openrouter` for image-to-diagram
- **GEMINI_API_KEY**: If using Gemini for image/speech
- **OPENROUTER_API_KEY**: If using OpenRouter (Meta Llama 4 Scout)
- **OPENROUTER_MODEL**: Default is `meta-llama/llama-4-scout:free`
- **JWT_SECRET**: For authentication (change in production)
- **PORT**: Backend port (default 3001)

## Architecture

### Backend (`backend/src/`)

**Entry point**: `index.ts`
- Express server with Socket.IO for real-time validation
- Multer for file uploads (10MB limit, supports .docx, .xlsx, .csv, images, audio)
- JWT authentication middleware

**Controllers** (`controllers/`):
- `authController.ts`: User signup, login, JWT authentication
- `diagramController.ts`: Main diagram generation (legacy, supports scratch mode)
- `diagramsController.ts`: CRUD for diagrams (project-based)
- `projectsController.ts`: CRUD for projects and chat history
- `fileController.ts`: File upload handling (images, documents, audio)

**Services** (`services/`):
- `reactAgent.ts`: **Core AI agent** - Uses OpenAI SDK with Cerebras base URL. Implements ReAct pattern with:
  - `generateInitialDiagram()`: Creates diagram from prompt
  - `validateDiagramRender()`: Socket.IO-based validation (5s timeout, 20 retry max)
  - `fixDiagram()`: Automatically repairs syntax errors
  - JSON-structured responses with `chatAnswer` and `mermaidDiagram` fields
  - Cleans markdown code fences from responses
- `geminiService.ts`: Gemini for image-to-Mermaid and speech-to-text
- `openRouterService.ts`: OpenRouter (Llama 4 Scout) for image-to-Mermaid
- `imageToMermaidService.ts`: Router between Gemini/OpenRouter

**Database** (`database/`):
- SQLite with Kysely query builder
- `schema.ts`: TypeScript types for users, projects, diagrams, diagram_versions, chat_messages
- `connection.ts`: Database connection singleton
- `migrations.ts`: Schema creation
- Chat messages now scoped per-diagram (not just per-project)

**Utils** (`utils/`):
- `fileConverters.ts`: Parse Word docs (mammoth), Excel/CSV (xlsx, papaparse)
- `auth.ts`: JWT token generation/verification

**Middleware** (`middleware/`):
- `auth.ts`: `authenticateToken` (required) and `optionalAuth` (backward compatibility)

### Frontend (`frontend/src/`)

**Entry point**: `main.tsx` → `App.tsx`

**App.tsx**: Main component using custom hooks for state management. Handles Socket.IO connection for render validation.

**Custom Hooks** (`hooks/`):
- `useAuth.ts`: Authentication context (via AuthContext)
- `useProject.ts`: Project selection and scratch mode
- `useDiagram.ts`: Diagram state, version selection
- `useModals.ts`: Modal state (auth, prompt, alert)
- `useChat.ts`: Chat messages, API calls to `/api/generate`
- `useMermaid.ts`: Mermaid rendering logic

**Components** (`components/`):
- `MermaidDiagram.tsx`: Renders Mermaid diagrams with panzoom, handles validation responses via Socket.IO
- `ChatPanel.tsx`: Chat interface with file upload, markdown rendering (react-markdown + remark-gfm)
- `FileUpload.tsx`: Drag-and-drop and paste support for images/documents/audio
- `ProjectSelector.tsx`: Dropdown to switch projects or enter scratch mode
- `DiagramsSidebar.tsx`: List diagrams in current project
- `DiagramVersionHistory.tsx`: Version selector for current diagram
- `HelpSection.tsx`: Collapsible help with example prompts
- `WelcomePage.tsx`: Landing page for unauthenticated users
- `AuthModal.tsx`: Login/signup modal
- `ScratchModeWarning.tsx`: Banner when in scratch mode

**Services** (`services/`):
- API client functions for projects, diagrams, auth

**Contexts** (`contexts/`):
- `AuthContext.tsx`: Global auth state, JWT storage in localStorage

**Styling**: Tailwind CSS with gradient backgrounds, backdrop blur, shadows

## Key Technical Details

### ReAct Agent Flow
1. User sends prompt via chat
2. Backend creates initial diagram via `reactAgent.generateInitialDiagram()`
3. Agent emits Socket.IO `renderValidationRequest` to frontend
4. Frontend attempts to render Mermaid diagram
5. Frontend emits `renderValidationResponse` (success/error)
6. If error, agent calls `fixDiagram()` and retries (max 20 attempts)
7. Returns final diagram with success status

### Socket.IO Events
- **Backend → Frontend**: `renderValidationRequest` (requestId, mermaidCode)
- **Frontend → Backend**: `renderValidationResponse` (requestId, success, error?)

### Authentication Flow
- JWT tokens stored in `localStorage` (frontend)
- `authenticateToken` middleware on protected routes
- `optionalAuth` for backward compatibility (scratch mode works without auth)

### Project vs Scratch Mode
- **Scratch Mode**: No persistence, no user required, single session
- **Project Mode**: Authenticated users, projects → diagrams → versions, persistent chat per diagram

### Database Schema
- `users`: Auth data
- `projects`: User-owned project containers
- `diagrams`: Named diagrams within projects
- `diagram_versions`: Version history (auto-incremented version number)
- `chat_messages`: Per-diagram chat history

### File Processing
- Images → Gemini/OpenRouter → Mermaid code
- Word docs → mammoth → text extraction
- Excel/CSV → xlsx/papaparse → data for diagram generation
- Audio → Gemini speech-to-text → transcript

## Common Tasks

### Adding a new diagram type support
Mermaid already supports all types. Just update prompts in `reactAgent.ts` system message if needed.

### Changing AI model
Update `CEREBRAS_MODEL` in `.env` or modify `reactAgent.ts` baseURL for different provider.

### Adding new file format
1. Add extension to `allowedExtensions` in `backend/src/index.ts`
2. Add converter in `backend/src/utils/fileConverters.ts`
3. Handle in `fileController.ts`

### Modifying validation retry logic
Edit `maxRetries` in `reactAgent.ts` `generateDiagram()` method (currently 20).

### Testing diagram rendering
The ReAct agent automatically validates via Socket.IO. Frontend Mermaid errors trigger auto-fix cycle.

## Type Safety
Both frontend and backend use strict TypeScript. Kysely provides type-safe database queries. API responses should match types defined in `backend/src/types/index.ts` and frontend type files.

## Build Output
- Backend: Compiles to `backend/dist/` (ES modules)
- Frontend: Compiles to `frontend/dist/` (static assets)

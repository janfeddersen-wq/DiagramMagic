# DiagramMagic ✨

AI-powered Mermaid diagram generator with intelligent chat interface and visual editing capabilities.

![DiagramMagic](https://img.shields.io/badge/AI-Powered-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6) ![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Core Capabilities
- 🤖 **ReAct AI Agent**: Intelligent diagram generation with self-validation and error correction
- ⚡ **Lightning Fast**: Powered by [Cerebras](https://cerebras.ai/) for ultra-fast AI inference
- 🔍 **Image to Mermaid**: Convert diagrams from images using [Meta Llama 4 Scout](https://openrouter.ai/meta-llama/llama-4-scout) via OpenRouter (or Gemini 2.5 Flash)
- 💬 **Context-aware Chat**: Maintains conversation history for iterative diagram refinement
- ✅ **Auto-validation**: Validates and fixes Mermaid syntax automatically
- 🎨 **Split-view UI**: Live diagram preview with interactive chat interface

### User Experience
- 📸 **Paste Images**: Copy & paste diagrams directly into chat (Ctrl+V / Cmd+V)
- 📄 **Document Support**: Upload Word docs, Excel files, or CSV for data-driven diagrams
- 🖼️ **Export Options**: Download as Markdown or high-quality PNG images
- 🔍 **Pan & Zoom**: Interactive diagram navigation with zoom controls
- 🎯 **Quick Start**: Built-in example prompts and comprehensive help guide
- 🎨 **Draw.io Integration**: Export to Draw.io for full visual editing

### Technical Features
- 📝 **GitHub Flavored Markdown**: Full GFM support including tables in chat
- 🔄 **Real-time Validation**: Socket.io-based diagram validation
- 🧹 **Clean State**: Clear chat and diagram for fresh starts
- 📊 **Multiple Diagram Types**: Flowcharts, sequence diagrams, Gantt charts, ER diagrams, and more

## 🏗️ Architecture

```
DiagramMagic/
├── backend/                    # Express.js + TypeScript Backend
│   └── src/
│       ├── controllers/        # API route handlers
│       │   ├── diagramController.ts   # Diagram generation
│       │   └── fileController.ts      # File uploads & conversion
│       ├── services/
│       │   ├── reactAgent.ts          # ReAct AI agent (Cerebras)
│       │   ├── geminiService.ts       # Gemini image processing
│       │   └── openRouterService.ts   # OpenRouter (Llama Scout)
│       ├── utils/
│       │   └── fileConverters.ts      # Document parsing
│       └── types/              # TypeScript definitions
│
└── frontend/                   # React + TypeScript Frontend
    └── src/
        ├── components/         # UI components
        │   ├── MermaidDiagram.tsx     # Diagram renderer
        │   ├── ChatPanel.tsx          # Chat interface
        │   ├── FileUpload.tsx         # File handling
        │   └── HelpSection.tsx        # Quick start guide
        ├── hooks/              # Custom React hooks
        ├── services/           # API client
        └── styles/             # Tailwind CSS
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Cerebras API Key** ([Get one here](https://cloud.cerebras.ai/))
- **OpenRouter API Key** (Optional - for image conversion with Llama Scout) ([Get one here](https://openrouter.ai/))
- **Gemini API Key** (Optional - alternative for image conversion) ([Get one here](https://makersuite.google.com/app/apikey))

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

4. **Open your browser**
   ```
   http://localhost:3000
   ```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# Required: Cerebras API for fast AI inference
CEREBRAS_API_KEY=your_cerebras_api_key_here
CEREBRAS_MODEL=llama3.1-8b

# Image to Mermaid Service
# Choose: 'gemini' or 'openrouter'
IMAGE_SERVICE=openrouter

# OpenRouter Configuration (Meta Llama 4 Scout - Free!)
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=meta-llama/llama-4-scout:free

# Gemini Configuration (Alternative)
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3001
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

### Generate Diagram
```http
POST /api/generate
Content-Type: application/json

{
  "prompt": "Create a flowchart for login",
  "chatHistory": [...],
  "currentDiagram": "graph TD..."
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

### Health Check
```http
GET /api/health
```

## 🛠️ Tech Stack

### Backend
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **Socket.io** - Real-time validation
- **OpenAI SDK** - Compatible with Cerebras & OpenRouter
- **Mermaid** - Diagram validation
- **Multer** - File uploads
- **Mammoth** - Word document parsing
- **XLSX** - Excel parsing

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

### AI Services
- **Cerebras** - Ultra-fast LLM inference (main agent)
- **Meta Llama 4 Scout** - Image to diagram (via OpenRouter)
- **Gemini 2.5 Flash** - Alternative image processing

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

**Slow response times?**
- Cerebras should be very fast - check API key
- Verify network connection
- Check backend logs for errors

## 📧 Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/janfeddersen-wq/DiagramMagic/issues)
- Check existing documentation
- Review example prompts in the app

---

**Built with ❤️ using AI-powered tools**

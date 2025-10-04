import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DiagramController } from './controllers/diagramController.js';
import { FileController } from './controllers/fileController.js';
import { AuthController } from './controllers/authController.js';
import { ProjectsController } from './controllers/projectsController.js';
import { DiagramsController } from './controllers/diagramsController.js';
import { authenticateToken, optionalAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});
const port = process.env.PORT || 3001;

// Validate environment variables
if (!process.env.CEREBRAS_API_KEY) {
  console.error('Error: CEREBRAS_API_KEY is not set in environment variables');
  process.exit(1);
}

const cerebrasModel = process.env.CEREBRAS_MODEL || 'llama3.1-8b';
const geminiApiKey = process.env.GEMINI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const imageService = process.env.IMAGE_SERVICE as 'gemini' | 'openrouter' | undefined;
const speechService = process.env.SPEECH_SERVICE as 'gemini' | undefined;
const openRouterModel = process.env.OPENROUTER_MODEL || 'meta-llama/llama-4-scout:free';

if (!geminiApiKey && !openRouterApiKey) {
  console.warn('Warning: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set. Image-to-diagram conversion will not be available.');
} else {
  console.log(`Image service configured: ${imageService || (geminiApiKey ? 'gemini' : 'openrouter')}`);
}

if (speechService === 'gemini' && !geminiApiKey) {
  console.warn('Warning: SPEECH_SERVICE is set to gemini but GEMINI_API_KEY is not set. Speech-to-text will not be available.');
} else if (speechService === 'gemini') {
  console.log(`Speech service configured: gemini`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.docx', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.webm', '.mp3', '.wav', '.ogg', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize controllers
const diagramController = new DiagramController(process.env.CEREBRAS_API_KEY, cerebrasModel, io);
const fileController = new FileController({
  imageService: imageService || (geminiApiKey ? 'gemini' : openRouterApiKey ? 'openrouter' : undefined),
  speechService: speechService || (geminiApiKey ? 'gemini' : undefined),
  geminiApiKey,
  openRouterApiKey,
  openRouterModel
});
const authController = new AuthController();
const projectsController = new ProjectsController();
const diagramsController = new DiagramsController();

// Voice Agent API key to Socket mapping
const voiceAgentApiKeyMap = new Map<string, string>(); // apiKey -> socketId

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Set up render validation listeners
  diagramController.setupSocketListeners(socket);

  // Voice Agent API key registration
  socket.on('voice-agent:register', (apiKey: string) => {
    console.log('🔑 [SOCKET.IO] Voice agent API key registration received');
    console.log('🔑 [SOCKET.IO] API Key:', apiKey.substring(0, 10) + '...');
    console.log('🔑 [SOCKET.IO] Socket ID:', socket.id);
    voiceAgentApiKeyMap.set(apiKey, socket.id);
    console.log('🔑 [SOCKET.IO] API key mapped successfully');
    console.log('🔑 [SOCKET.IO] Total mappings:', voiceAgentApiKeyMap.size);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // Clean up API key mapping on disconnect
    for (const [apiKey, socketId] of voiceAgentApiKeyMap.entries()) {
      if (socketId === socket.id) {
        voiceAgentApiKeyMap.delete(apiKey);
        console.log('Cleaned up voice agent API key');
      }
    }
  });
});

// Routes

// Auth routes (public)
app.post('/api/auth/signup', (req, res) => authController.signup(req, res));
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.get('/api/auth/me', authenticateToken, (req, res) => authController.me(req, res));

// Project routes (authenticated)
app.get('/api/projects', authenticateToken, (req, res) => projectsController.list(req, res));
app.post('/api/projects', authenticateToken, (req, res) => projectsController.create(req, res));
app.get('/api/projects/:id', authenticateToken, (req, res) => projectsController.get(req, res));
app.put('/api/projects/:id', authenticateToken, (req, res) => projectsController.update(req, res));
app.delete('/api/projects/:id', authenticateToken, (req, res) => projectsController.delete(req, res));
app.get('/api/projects/:id/chat', authenticateToken, (req, res) => projectsController.getChatHistory(req, res));

// Diagram routes (authenticated)
app.get('/api/projects/:projectId/diagrams', authenticateToken, (req, res) => diagramsController.listByProject(req, res));
app.post('/api/projects/:projectId/diagrams', authenticateToken, (req, res) => diagramsController.create(req, res));
app.get('/api/diagrams/:id', authenticateToken, (req, res) => diagramsController.get(req, res));
app.get('/api/diagrams/:id/chat', authenticateToken, (req, res) => diagramsController.getChatHistory(req, res));
app.delete('/api/diagrams/:id', authenticateToken, (req, res) => diagramsController.delete(req, res));
app.post('/api/diagrams/:id/versions', authenticateToken, (req, res) => diagramsController.createVersion(req, res));
app.get('/api/diagrams/:id/versions', authenticateToken, (req, res) => diagramsController.listVersions(req, res));

// Existing routes (now with optional auth for backward compatibility)
app.post('/api/generate', optionalAuth, (req, res) => diagramController.generateDiagram(req, res));
app.post('/api/upload', upload.single('file'), optionalAuth, (req, res) => fileController.uploadFile(req, res));
app.post('/api/transcribe', upload.single('audio'), (req, res) => fileController.transcribeAudio(req, res));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Voice Agent tool calls endpoint
app.post('/api/voice-agent/tool-call', (req, res) => {
  console.log('🎯 [BACKEND] Received voice agent tool call');
  console.log('🎯 [BACKEND] Request body:', req.body);

  const { apiKey, toolName, params } = req.body;

  if (!apiKey) {
    console.error('🎯 [BACKEND] No API key provided');
    return res.status(401).json({ error: 'API key required' });
  }

  console.log('🎯 [BACKEND] Looking up API key:', apiKey.substring(0, 10) + '...');
  console.log('🎯 [BACKEND] Current API key mappings:', Array.from(voiceAgentApiKeyMap.keys()).map(k => k.substring(0, 10) + '...'));

  const socketId = voiceAgentApiKeyMap.get(apiKey);
  if (!socketId) {
    console.error('🎯 [BACKEND] API key not found in mappings');
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  console.log('🎯 [BACKEND] Found socket ID:', socketId);

  const socket = io.sockets.sockets.get(socketId);
  if (!socket) {
    console.error('🎯 [BACKEND] Socket not found for ID:', socketId);
    voiceAgentApiKeyMap.delete(apiKey); // Clean up stale mapping
    return res.status(404).json({ error: 'Client disconnected' });
  }

  // Emit event to the specific client's UI
  const eventName = `voice-agent:${toolName}`;
  console.log('🎯 [BACKEND] Emitting event:', eventName, 'to socket:', socketId);
  console.log('🎯 [BACKEND] Event params:', params);

  socket.emit(eventName, params);
  console.log('🎯 [BACKEND] Event emitted successfully!');

  res.json({ success: true, message: `${toolName} triggered` });
});

// Create uploads directory if it doesn't exist
import fs from 'fs';
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Start server
httpServer.listen(port, () => {
  console.log(`🚀 DiagramAI backend running on port ${port}`);
  console.log(`🤖 Using model: ${cerebrasModel}`);
  console.log(`📍 API endpoint: http://localhost:${port}/api/generate`);
  console.log(`📁 File upload endpoint: http://localhost:${port}/api/upload`);
  console.log(`🔌 Socket.IO server running`);
  if (geminiApiKey) {
    console.log(`🖼️  Image-to-diagram conversion: Enabled`);
  }
});

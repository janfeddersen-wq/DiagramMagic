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
import { db } from './database/connection.js';
import { createLogger } from './utils/logger.js';

dotenv.config();

const logger = createLogger('Server');

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
  logger.error('Error: CEREBRAS_API_KEY is not set in environment variables');
  process.exit(1);
}

const cerebrasModel = process.env.CEREBRAS_MODEL || 'llama3.1-8b';
const geminiApiKey = process.env.GEMINI_API_KEY;
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
const imageService = process.env.IMAGE_SERVICE as 'gemini' | 'openrouter' | undefined;
const speechService = process.env.SPEECH_SERVICE as 'gemini' | undefined;
const openRouterModel = process.env.OPENROUTER_MODEL || 'meta-llama/llama-4-scout:free';

if (!geminiApiKey && !openRouterApiKey) {
  logger.warn('Warning: Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set. Image-to-diagram conversion will not be available.');
} else {
  logger.info(`Image service configured: ${imageService || (geminiApiKey ? 'gemini' : 'openrouter')}`);
}

if (speechService === 'gemini' && !geminiApiKey) {
  logger.warn('Warning: SPEECH_SERVICE is set to gemini but GEMINI_API_KEY is not set. Speech-to-text will not be available.');
} else if (speechService === 'gemini') {
  logger.info(`Speech service configured: gemini`);
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

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

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
interface VoiceAgentSession {
  socketId: string;
  userId?: number;
  currentProjectId?: number;
}
const voiceAgentApiKeyMap = new Map<string, VoiceAgentSession>(); // apiKey -> session

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info('Client connected: ' + socket.id);

  // Set up render validation listeners
  diagramController.setupSocketListeners(socket);

  // Voice Agent API key registration
  socket.on('voice-agent:register', async (data: { apiKey: string; userToken?: string } | string) => {
    // Handle both old string format and new object format for backward compatibility
    const apiKey = typeof data === 'string' ? data : data.apiKey;
    const userToken = typeof data === 'object' && data !== null ? data.userToken : undefined;

    logger.info('Voice agent API key registration received');
    logger.debug('API Key: ' + apiKey?.substring(0, 10) + '...');
    logger.debug('Has user token: ' + !!userToken);
    logger.debug('Socket ID: ' + socket.id);

    // Decode JWT to get user ID
    let userId: number | undefined;
    if (userToken) {
      try {
        const { verifyToken } = await import('./utils/auth.js');
        const decoded = verifyToken(userToken);
        userId = decoded.userId;
        logger.debug('Decoded user ID: ' + userId);
      } catch (error) {
        logger.error('Failed to decode JWT:', error);
      }
    }

    voiceAgentApiKeyMap.set(apiKey, { socketId: socket.id, userId });
    logger.info('API key mapped successfully');
    logger.debug('Total mappings: ' + voiceAgentApiKeyMap.size);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected: ' + socket.id);

    // Clean up API key mapping on disconnect
    for (const [apiKey, session] of voiceAgentApiKeyMap.entries()) {
      if (session.socketId === socket.id) {
        voiceAgentApiKeyMap.delete(apiKey);
        logger.info('Cleaned up voice agent API key');
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
app.post('/api/voice-agent/tool-call', async (req, res) => {
  logger.info('Received voice agent tool call');
  logger.debug('Request body: ' + JSON.stringify(req.body));

  const { apiKey, toolName, params } = req.body;

  if (!apiKey) {
    logger.error('No API key provided');
    return res.status(401).json({ error: 'API key required' });
  }

  logger.debug('Looking up API key: ' + apiKey.substring(0, 10) + '...');
  logger.debug('Current API key mappings: ' + Array.from(voiceAgentApiKeyMap.keys()).map(k => k.substring(0, 10) + '...').join(', '));

  const session = voiceAgentApiKeyMap.get(apiKey);
  if (!session) {
    logger.error('API key not found in mappings');
    return res.status(404).json({ error: 'Session not found or expired' });
  }

  logger.debug('Found socket ID: ' + session.socketId);

  const socket = io.sockets.sockets.get(session.socketId);
  if (!socket) {
    logger.error('Socket not found for ID: ' + session.socketId);
    voiceAgentApiKeyMap.delete(apiKey); // Clean up stale mapping
    return res.status(404).json({ error: 'Client disconnected' });
  }

  // Handle ListProjects specially - return data for the agent to speak
  if (toolName === 'ListProjects') {
    try {
      const userId = session.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const projects = await db
        .selectFrom('projects')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('updated_at', 'desc')
        .execute();

      // Return projects list for the agent to speak
      return res.json({
        success: true,
        projects: projects.map(p => ({ id: p.id, name: p.name }))
      });
    } catch (error) {
      logger.error('Error listing projects:', error);
      return res.status(500).json({ error: 'Failed to list projects' });
    }
  }

  // Handle ListDiagrams specially - ask UI for current project, then return diagrams
  if (toolName === 'ListDiagrams') {
    try {
      logger.info('ListDiagrams - Requesting current project from UI...');

      // Ask the UI what project is currently selected
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('ListDiagrams - Timeout waiting for UI response');
          res.json({
            success: false,
            message: 'No project selected. Please select a project first.',
            diagrams: []
          });
          resolve();
        }, 2000);

        socket.once('voice-agent:current-project-response', async (data: { projectId: number | null }) => {
          clearTimeout(timeout);
          logger.debug('ListDiagrams - UI responded with project: ' + data.projectId);

          if (!data.projectId) {
            logger.debug('ListDiagrams - No project selected in UI');
            res.json({
              success: false,
              message: 'No project selected. Please select a project first.',
              diagrams: []
            });
            return resolve();
          }

          logger.debug('ListDiagrams - Querying diagrams for project: ' + data.projectId);
          const diagrams = await db
            .selectFrom('diagrams')
            .selectAll()
            .where('project_id', '=', data.projectId)
            .orderBy('updated_at', 'desc')
            .execute();

          logger.debug('ListDiagrams - Found diagrams: ' + diagrams.length);

          res.json({
            success: true,
            diagrams: diagrams.map(d => ({ id: d.id, name: d.name }))
          });
          return resolve();
        });

        // Emit request to UI for current project
        socket.emit('voice-agent:request-current-project');
      });
    } catch (error) {
      logger.error('Error listing diagrams:', error);
      return res.status(500).json({ error: 'Failed to list diagrams' });
    }
  }

  // Handle SelectProject - update session state
  if (toolName === 'SelectProject') {
    const { projectId } = params || {};
    if (projectId) {
      session.currentProjectId = projectId;
      voiceAgentApiKeyMap.set(apiKey, session); // Update the map
      logger.debug('Updated session current project ID to: ' + projectId);
    }
  }

  // Emit event to the specific client's UI for other tools
  const eventName = `voice-agent:${toolName}`;
  logger.info('Emitting event: ' + eventName + ' to socket: ' + session.socketId);
  logger.debug('Event params: ' + JSON.stringify(params));

  socket.emit(eventName, params);
  logger.info('Event emitted successfully!');

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
  logger.info(`DiagramAI backend running on port ${port}`);
  logger.info(`Using model: ${cerebrasModel}`);
  logger.info(`API endpoint: http://localhost:${port}/api/generate`);
  logger.info(`File upload endpoint: http://localhost:${port}/api/upload`);
  logger.info(`Socket.IO server running`);
  if (geminiApiKey) {
    logger.info(`Image-to-diagram conversion: Enabled`);
  }
});

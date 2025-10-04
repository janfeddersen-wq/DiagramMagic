import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { AccessToken } from 'livekit-server-sdk';
import crypto from 'crypto';

// Load environment variables
config({ path: '../backend/.env' });

const app = express();
const PORT = process.env.VOICE_AGENT_PORT || 3002;

app.use(cors());
app.use(express.json());

// Generate secure API key
function generateApiKey(): string {
  return `va_${crypto.randomBytes(32).toString('hex')}`;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'voice-agent' });
});

// Token generation endpoint
app.post('/token', async (req, res) => {
  try {
    const roomName = req.body.roomName || `diagram-magic-${Date.now()}`;
    const participantName = req.body.participantName || `user-${Date.now()}`;

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return res.status(500).json({ error: 'LiveKit credentials not configured' });
    }

    // Generate API key for tool calls
    const voiceApiKey = generateApiKey();

    const token = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
      // Pass API key in metadata so the agent can access it
      metadata: JSON.stringify({ apiKey: voiceApiKey }),
    });

    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();

    res.json({
      token: jwt,
      url: process.env.LIVEKIT_URL,
      roomName,
      apiKey: voiceApiKey, // Include API key for UI registration
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

app.listen(PORT, () => {
  console.log(`🎙️  Voice Agent HTTP server running on http://localhost:${PORT}`);
  console.log(`📡 Token endpoint: http://localhost:${PORT}/token`);
});

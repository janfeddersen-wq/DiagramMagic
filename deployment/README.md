# DiagramMagic Deployment Guide

## Prerequisites

- Node.js 18+ installed
- Nginx installed
- PM2 (recommended for process management): `npm install -g pm2`

## Build Steps

### 1. Build Backend
```bash
cd backend
npm install --production
npm run build
```

### 2. Build Voice Agent
```bash
cd voice-agent
npm install --production
npm run build
```

### 3. Build Frontend
```bash
cd frontend
npm install --production
npm run build
```

## Environment Configuration

### Backend (.env)
Create `backend/.env`:
```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-domain.com
JWT_SECRET=your-secure-random-string
CEREBRAS_API_KEY=your-cerebras-key
CEREBRAS_MODEL=llama3.1-8b
IMAGE_SERVICE=gemini
GEMINI_API_KEY=your-gemini-key
```

### Voice Agent (.env)
Create `voice-agent/.env`:
```env
NODE_ENV=production
PORT=3002
BACKEND_URL=http://localhost:3001
GEMINI_API_KEY=your-gemini-key
GEMINI_MODEL=gemini-2.0-flash-exp
```

## Nginx Setup

1. Copy nginx config:
```bash
sudo cp deployment/nginx.conf /etc/nginx/sites-available/diagrammagic
```

2. Edit the config:
```bash
sudo nano /etc/nginx/sites-available/diagrammagic
```

Update:
- `server_name` to your domain
- `root` path to your frontend/dist location

3. Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/diagrammagic /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Running the Application

### Option 1: Using PM2 (Recommended)

```bash
# Start backend
cd backend
pm2 start dist/index.js --name diagrammagic-backend

# Start voice agent
cd ../voice-agent
pm2 start dist/index.js --name diagrammagic-voice-agent

# Save PM2 config
pm2 save
pm2 startup
```

### Option 2: Using systemd

Create service files in `/etc/systemd/system/`:

**diagrammagic-backend.service:**
```ini
[Unit]
Description=DiagramMagic Backend
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/DiagramMagic/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

**diagrammagic-voice-agent.service:**
```ini
[Unit]
Description=DiagramMagic Voice Agent
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/DiagramMagic/voice-agent
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable diagrammagic-backend
sudo systemctl enable diagrammagic-voice-agent
sudo systemctl start diagrammagic-backend
sudo systemctl start diagrammagic-voice-agent
```

## SSL/HTTPS Setup (Recommended)

Using Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Monitoring

### PM2
```bash
pm2 status
pm2 logs
pm2 monit
```

### systemd
```bash
sudo systemctl status diagrammagic-backend
sudo journalctl -u diagrammagic-backend -f
```

## Updates

```bash
# Stop services
pm2 stop all  # or sudo systemctl stop diagrammagic-*

# Pull changes
git pull

# Rebuild
cd backend && npm run build
cd ../voice-agent && npm run build
cd ../frontend && npm run build

# Restart services
pm2 restart all  # or sudo systemctl start diagrammagic-*
```

## Troubleshooting

- Check nginx logs: `/var/log/nginx/error.log`
- Check application logs: `pm2 logs` or `journalctl`
- Verify ports 3001 and 3002 are not blocked by firewall
- Ensure WebSocket connections are allowed through nginx

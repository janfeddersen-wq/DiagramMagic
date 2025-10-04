#!/bin/bash

# DiagramAI Management Script
# Manages backend and frontend processes with logging

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGS_DIR="$SCRIPT_DIR/logs"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
VOICE_AGENT_DIR="$SCRIPT_DIR/voice-agent"

# Create logs directory
mkdir -p "$LOGS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# PID files
BACKEND_PID_FILE="$LOGS_DIR/backend.pid"
FRONTEND_PID_FILE="$LOGS_DIR/frontend.pid"
VOICE_AGENT_SERVER_PID_FILE="$LOGS_DIR/voice-agent-server.pid"
VOICE_AGENT_WORKER_PID_FILE="$LOGS_DIR/voice-agent-worker.pid"

# Log files
BACKEND_LOG="$LOGS_DIR/backend.log"
FRONTEND_LOG="$LOGS_DIR/frontend.log"
VOICE_AGENT_SERVER_LOG="$LOGS_DIR/voice-agent-server.log"
VOICE_AGENT_WORKER_LOG="$LOGS_DIR/voice-agent-worker.log"

function print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

function print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

function print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

function check_dependencies() {
    print_status "Checking dependencies..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    if [ ! -f "$BACKEND_DIR/package.json" ]; then
        print_error "Backend not found. Run this script from the DiagramAI root directory."
        exit 1
    fi

    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        print_error "Frontend not found. Run this script from the DiagramAI root directory."
        exit 1
    fi

    print_status "Dependencies check passed ✓"
}

function install_dependencies() {
    print_status "Installing dependencies..."

    print_status "Installing backend dependencies..."
    cd "$BACKEND_DIR"
    npm install >> "$LOGS_DIR/install.log" 2>&1

    print_status "Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install >> "$LOGS_DIR/install.log" 2>&1

    print_status "Installing voice-agent dependencies..."
    cd "$VOICE_AGENT_DIR"
    npm install >> "$LOGS_DIR/install.log" 2>&1

    cd "$SCRIPT_DIR"
    print_status "Dependencies installed ✓"
}

function start_backend() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            print_warning "Backend is already running (PID: $PID)"
            return
        fi
    fi

    print_status "Starting backend..."

    # Check if .env exists
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        print_error "Backend .env file not found. Please create it from .env.example"
        exit 1
    fi

    cd "$BACKEND_DIR"

    # Rotate log if it's too large (>10MB)
    if [ -f "$BACKEND_LOG" ] && [ $(stat -f%z "$BACKEND_LOG" 2>/dev/null || stat -c%s "$BACKEND_LOG" 2>/dev/null) -gt 10485760 ]; then
        mv "$BACKEND_LOG" "$BACKEND_LOG.$(date +%Y%m%d_%H%M%S)"
    fi

    nohup npm run dev > "$BACKEND_LOG" 2>&1 &
    echo $! > "$BACKEND_PID_FILE"

    print_status "Backend started (PID: $(cat $BACKEND_PID_FILE)) ✓"
    print_status "Backend logs: $BACKEND_LOG"

    cd "$SCRIPT_DIR"
}

function start_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            print_warning "Frontend is already running (PID: $PID)"
            return
        fi
    fi

    print_status "Starting frontend..."

    cd "$FRONTEND_DIR"

    # Rotate log if it's too large (>10MB)
    if [ -f "$FRONTEND_LOG" ] && [ $(stat -f%z "$FRONTEND_LOG" 2>/dev/null || stat -c%s "$FRONTEND_LOG" 2>/dev/null) -gt 10485760 ]; then
        mv "$FRONTEND_LOG" "$FRONTEND_LOG.$(date +%Y%m%d_%H%M%S)"
    fi

    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    echo $! > "$FRONTEND_PID_FILE"

    print_status "Frontend started (PID: $(cat $FRONTEND_PID_FILE)) ✓"
    print_status "Frontend logs: $FRONTEND_LOG"

    cd "$SCRIPT_DIR"
}

function start_voice_agent() {
    # Check if already running
    if [ -f "$VOICE_AGENT_SERVER_PID_FILE" ] && [ -f "$VOICE_AGENT_WORKER_PID_FILE" ]; then
        SERVER_PID=$(cat "$VOICE_AGENT_SERVER_PID_FILE")
        WORKER_PID=$(cat "$VOICE_AGENT_WORKER_PID_FILE")
        if ps -p "$SERVER_PID" > /dev/null 2>&1 && ps -p "$WORKER_PID" > /dev/null 2>&1; then
            print_warning "Voice Agent is already running (Server: $SERVER_PID, Worker: $WORKER_PID)"
            return
        fi
    fi

    print_status "Starting Voice Agent..."

    # Check if .env exists in backend (voice-agent reads from there)
    if [ ! -f "$BACKEND_DIR/.env" ]; then
        print_error "Backend .env file not found. Voice Agent requires LiveKit configuration."
        exit 1
    fi

    cd "$VOICE_AGENT_DIR"

    # Rotate logs if too large (>10MB)
    if [ -f "$VOICE_AGENT_SERVER_LOG" ] && [ $(stat -f%z "$VOICE_AGENT_SERVER_LOG" 2>/dev/null || stat -c%s "$VOICE_AGENT_SERVER_LOG" 2>/dev/null) -gt 10485760 ]; then
        mv "$VOICE_AGENT_SERVER_LOG" "$VOICE_AGENT_SERVER_LOG.$(date +%Y%m%d_%H%M%S)"
    fi
    if [ -f "$VOICE_AGENT_WORKER_LOG" ] && [ $(stat -f%z "$VOICE_AGENT_WORKER_LOG" 2>/dev/null || stat -c%s "$VOICE_AGENT_WORKER_LOG" 2>/dev/null) -gt 10485760 ]; then
        mv "$VOICE_AGENT_WORKER_LOG" "$VOICE_AGENT_WORKER_LOG.$(date +%Y%m%d_%H%M%S)"
    fi

    # Start HTTP server (token generation)
    nohup npm run server > "$VOICE_AGENT_SERVER_LOG" 2>&1 &
    echo $! > "$VOICE_AGENT_SERVER_PID_FILE"

    # Start agent worker (voice processing)
    nohup npm run dev > "$VOICE_AGENT_WORKER_LOG" 2>&1 &
    echo $! > "$VOICE_AGENT_WORKER_PID_FILE"

    print_status "Voice Agent Server started (PID: $(cat $VOICE_AGENT_SERVER_PID_FILE)) ✓"
    print_status "Voice Agent Worker started (PID: $(cat $VOICE_AGENT_WORKER_PID_FILE)) ✓"
    print_status "Server logs: $VOICE_AGENT_SERVER_LOG"
    print_status "Worker logs: $VOICE_AGENT_WORKER_LOG"

    cd "$SCRIPT_DIR"
}

function stop_backend() {
    if [ ! -f "$BACKEND_PID_FILE" ]; then
        print_warning "Backend PID file not found"
        return
    fi

    PID=$(cat "$BACKEND_PID_FILE")

    if ps -p "$PID" > /dev/null 2>&1; then
        print_status "Stopping backend (PID: $PID)..."
        kill "$PID"
        sleep 2

        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            print_warning "Force stopping backend..."
            kill -9 "$PID"
        fi

        print_status "Backend stopped ✓"
    else
        print_warning "Backend process not found"
    fi

    rm -f "$BACKEND_PID_FILE"
}

function stop_frontend() {
    if [ ! -f "$FRONTEND_PID_FILE" ]; then
        print_warning "Frontend PID file not found"
        return
    fi

    PID=$(cat "$FRONTEND_PID_FILE")

    if ps -p "$PID" > /dev/null 2>&1; then
        print_status "Stopping frontend (PID: $PID)..."
        kill "$PID"
        sleep 2

        # Force kill if still running
        if ps -p "$PID" > /dev/null 2>&1; then
            print_warning "Force stopping frontend..."
            kill -9 "$PID"
        fi

        print_status "Frontend stopped ✓"
    else
        print_warning "Frontend process not found"
    fi

    rm -f "$FRONTEND_PID_FILE"
}

function stop_voice_agent() {
    local stopped=false

    # Stop server
    if [ -f "$VOICE_AGENT_SERVER_PID_FILE" ]; then
        SERVER_PID=$(cat "$VOICE_AGENT_SERVER_PID_FILE")
        if ps -p "$SERVER_PID" > /dev/null 2>&1; then
            print_status "Stopping Voice Agent Server (PID: $SERVER_PID)..."
            kill "$SERVER_PID"
            sleep 1
            if ps -p "$SERVER_PID" > /dev/null 2>&1; then
                kill -9 "$SERVER_PID"
            fi
            stopped=true
        fi
        rm -f "$VOICE_AGENT_SERVER_PID_FILE"
    fi

    # Stop worker
    if [ -f "$VOICE_AGENT_WORKER_PID_FILE" ]; then
        WORKER_PID=$(cat "$VOICE_AGENT_WORKER_PID_FILE")
        if ps -p "$WORKER_PID" > /dev/null 2>&1; then
            print_status "Stopping Voice Agent Worker (PID: $WORKER_PID)..."
            kill "$WORKER_PID"
            sleep 1
            if ps -p "$WORKER_PID" > /dev/null 2>&1; then
                kill -9 "$WORKER_PID"
            fi
            stopped=true
        fi
        rm -f "$VOICE_AGENT_WORKER_PID_FILE"
    fi

    if [ "$stopped" = true ]; then
        print_status "Voice Agent stopped ✓"
    else
        print_warning "Voice Agent was not running"
    fi
}

function show_status() {
    print_status "DiagramMagic Status:"
    echo ""

    # Backend status
    if [ -f "$BACKEND_PID_FILE" ]; then
        PID=$(cat "$BACKEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "  Backend:     ${GREEN}RUNNING${NC} (PID: $PID)"
        else
            echo -e "  Backend:     ${RED}STOPPED${NC} (stale PID file)"
        fi
    else
        echo -e "  Backend:     ${RED}STOPPED${NC}"
    fi

    # Frontend status
    if [ -f "$FRONTEND_PID_FILE" ]; then
        PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo -e "  Frontend:    ${GREEN}RUNNING${NC} (PID: $PID)"
        else
            echo -e "  Frontend:    ${RED}STOPPED${NC} (stale PID file)"
        fi
    else
        echo -e "  Frontend:    ${RED}STOPPED${NC}"
    fi

    # Voice Agent status
    local va_server_running=false
    local va_worker_running=false

    if [ -f "$VOICE_AGENT_SERVER_PID_FILE" ]; then
        SERVER_PID=$(cat "$VOICE_AGENT_SERVER_PID_FILE")
        if ps -p "$SERVER_PID" > /dev/null 2>&1; then
            va_server_running=true
        fi
    fi

    if [ -f "$VOICE_AGENT_WORKER_PID_FILE" ]; then
        WORKER_PID=$(cat "$VOICE_AGENT_WORKER_PID_FILE")
        if ps -p "$WORKER_PID" > /dev/null 2>&1; then
            va_worker_running=true
        fi
    fi

    if [ "$va_server_running" = true ] && [ "$va_worker_running" = true ]; then
        echo -e "  Voice Agent: ${GREEN}RUNNING${NC} (Server: $SERVER_PID, Worker: $WORKER_PID)"
    elif [ "$va_server_running" = true ]; then
        echo -e "  Voice Agent: ${YELLOW}PARTIAL${NC} (Server only: $SERVER_PID)"
    elif [ "$va_worker_running" = true ]; then
        echo -e "  Voice Agent: ${YELLOW}PARTIAL${NC} (Worker only: $WORKER_PID)"
    else
        echo -e "  Voice Agent: ${RED}STOPPED${NC}"
    fi

    echo ""
    print_status "Logs directory: $LOGS_DIR"
}

function tail_logs() {
    print_status "Tailing logs (Ctrl+C to stop)..."
    echo ""

    # Collect existing log files
    LOGS=()
    [ -f "$BACKEND_LOG" ] && LOGS+=("$BACKEND_LOG")
    [ -f "$FRONTEND_LOG" ] && LOGS+=("$FRONTEND_LOG")
    [ -f "$VOICE_AGENT_SERVER_LOG" ] && LOGS+=("$VOICE_AGENT_SERVER_LOG")
    [ -f "$VOICE_AGENT_WORKER_LOG" ] && LOGS+=("$VOICE_AGENT_WORKER_LOG")

    if [ ${#LOGS[@]} -gt 0 ]; then
        tail -f "${LOGS[@]}"
    else
        print_warning "No log files found"
    fi
}

function clean_logs() {
    print_status "Cleaning logs..."
    rm -f "$LOGS_DIR"/*.log
    rm -f "$LOGS_DIR"/*.pid
    print_status "Logs cleaned ✓"
}

function show_help() {
    echo "DiagramMagic Management Script"
    echo ""
    echo "Usage: ./manage.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start       Start all services (backend, frontend, voice-agent)"
    echo "  stop        Stop all services"
    echo "  restart     Restart all services"
    echo "  status      Show status of all services"
    echo "  logs        Tail log files"
    echo "  clean-logs  Clean all log files"
    echo "  install     Install dependencies for all services"
    echo "  help        Show this help message"
    echo ""
    echo "Individual service commands:"
    echo "  start-backend       Start only backend"
    echo "  start-frontend      Start only frontend"
    echo "  start-voice-agent   Start only voice agent"
    echo "  stop-backend        Stop only backend"
    echo "  stop-frontend       Stop only frontend"
    echo "  stop-voice-agent    Stop only voice agent"
    echo ""
}

# Main command handler
case "${1:-help}" in
    start)
        check_dependencies
        start_backend
        sleep 2
        start_voice_agent
        sleep 2
        start_frontend
        echo ""
        print_status "DiagramMagic started successfully!"
        print_status "Backend: http://localhost:3001"
        print_status "Voice Agent: http://localhost:3002"
        print_status "Frontend: http://localhost:3000"
        echo ""
        print_status "Run './manage.sh logs' to view logs"
        print_status "Run './manage.sh status' to check status"
        ;;

    stop)
        stop_frontend
        stop_voice_agent
        stop_backend
        echo ""
        print_status "DiagramMagic stopped"
        ;;

    restart)
        print_status "Restarting DiagramMagic..."
        stop_frontend
        stop_voice_agent
        stop_backend
        sleep 2
        start_backend
        sleep 2
        start_voice_agent
        sleep 2
        start_frontend
        echo ""
        print_status "DiagramMagic restarted successfully!"
        ;;

    status)
        show_status
        ;;

    logs)
        tail_logs
        ;;

    clean-logs)
        clean_logs
        ;;

    install)
        check_dependencies
        install_dependencies
        ;;

    start-backend)
        check_dependencies
        start_backend
        ;;

    start-frontend)
        check_dependencies
        start_frontend
        ;;

    start-voice-agent)
        check_dependencies
        start_voice_agent
        ;;

    stop-backend)
        stop_backend
        ;;

    stop-frontend)
        stop_frontend
        ;;

    stop-voice-agent)
        stop_voice_agent
        ;;

    help|--help|-h)
        show_help
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac

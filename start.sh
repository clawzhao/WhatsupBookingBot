#!/bin/bash

# WhatsApp & Telegram Booking Demo - Startup Script
# Starts both Python (WhatsApp) and Node.js (Telegram) services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PYTHON_PORT=${PYTHON_PORT:-3010}
NODE_PORT=${NODE_PORT:-3000}
LOG_DIR="logs"

# Create logs directory
mkdir -p "$LOG_DIR"

echo -e "${BLUE}🚀 WhatsApp & Telegram Booking Demo${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Function to display usage
usage() {
    echo -e "${YELLOW}Usage:${NC} $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --python-only       Start only Python/WhatsApp service"
    echo "  --node-only         Start only Node.js/Telegram service"
    echo "  --background        Run services in background"
    echo "  --no-logs           Don't show live logs"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  Start both services with live logs"
    echo "  $0 --background     Start both services in background"
    echo "  $0 --python-only    Start only WhatsApp service"
}

# Parse command line arguments
PYTHON_ONLY=false
NODE_ONLY=false
BACKGROUND=false
SHOW_LOGS=true

while [[ $# -gt 0 ]]; do
    case $1 in
        --python-only)
            PYTHON_ONLY=true
            shift
            ;;
        --node-only)
            NODE_ONLY=true
            shift
            ;;
        --background)
            BACKGROUND=true
            shift
            ;;
        --no-logs)
            SHOW_LOGS=false
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
    esac
done

# Function to start Python service
start_python() {
    echo -e "${GREEN}📦 Starting WhatsApp Service (Python/Flask)...${NC}"
    
    if [ ! -d "venv" ]; then
        echo -e "${YELLOW}⚠️  Virtual environment not found. Creating...${NC}"
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt -q
    fi
    
    source venv/bin/activate
    
    if [ "$BACKGROUND" = true ]; then
        python app.py > "$LOG_DIR/python.log" 2>&1 &
        PYTHON_PID=$!
        echo -e "${GREEN}✓ WhatsApp service starting on http://localhost:$PYTHON_PORT (PID: $PYTHON_PID)${NC}"
    else
        echo -e "${GREEN}✓ WhatsApp service starting on http://localhost:$PYTHON_PORT${NC}"
        python app.py
    fi
}

# Function to start Node service
start_node() {
    echo -e "${GREEN}📦 Starting Telegram Service (Node.js/Express)...${NC}"
    
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️  Dependencies not found. Installing...${NC}"
        npm install -q
    fi
    
    if [ "$BACKGROUND" = true ]; then
        npm start > "$LOG_DIR/node.log" 2>&1 &
        NODE_PID=$!
        echo -e "${GREEN}✓ Telegram service starting on http://localhost:$NODE_PORT (PID: $NODE_PID)${NC}"
    else
        echo -e "${GREEN}✓ Telegram service starting on http://localhost:$NODE_PORT${NC}"
        npm start
    fi
}

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}Checking prerequisites...${NC}"
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}✗ Python 3 not found${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}✗ npm not found${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Python 3: $(python3 --version)${NC}"
    echo -e "${GREEN}✓ npm: $(npm --version)${NC}"
    echo ""
}

# Main execution
check_prerequisites

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Warning: TELEGRAM_BOT_TOKEN not set. Telegram service may not work.${NC}"
    echo -e "${YELLOW}   Set it in .env file or export TELEGRAM_BOT_TOKEN${NC}"
    echo ""
fi

# Set trap for cleanup
trap cleanup EXIT

# Start services based on options
if [ "$PYTHON_ONLY" = false ] && [ "$NODE_ONLY" = false ]; then
    # Start both services
    if [ "$BACKGROUND" = false ] && [ "$SHOW_LOGS" = true ]; then
        # Run in parallel
        start_python &
        PYTHON_PID=$!
        
        sleep 2  # Give Python service time to start
        
        start_node &
        NODE_PID=$!
        
        echo ""
        echo -e "${GREEN}===================================${NC}"
        echo -e "${GREEN}✓ Both services are running!${NC}"
        echo -e "${GREEN}===================================${NC}"
        echo ""
        echo -e "${BLUE}Services:${NC}"
        echo -e "  🐍 WhatsApp (Python): http://localhost:$PYTHON_PORT"
        echo -e "  📱 Telegram (Node.js): http://localhost:$NODE_PORT"
        echo ""
        echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
        
        # Wait for both processes
        wait
    else
        start_python &
        PYTHON_PID=$!
        
        sleep 2
        
        start_node &
        NODE_PID=$!
        
        if [ "$BACKGROUND" = true ]; then
            echo ""
            echo -e "${GREEN}===================================${NC}"
            echo -e "${GREEN}✓ Services running in background!${NC}"
            echo -e "${GREEN}===================================${NC}"
            echo ""
            echo -e "${BLUE}PIDs:${NC}"
            echo -e "  🐍 Python (WhatsApp): PID $PYTHON_PID"
            echo -e "  📱 Node.js (Telegram): PID $NODE_PID"
            echo ""
            echo -e "${BLUE}Logs:${NC}"
            echo -e "  Python: $LOG_DIR/python.log"
            echo -e "  Node.js: $LOG_DIR/node.log"
            echo ""
            echo -e "${YELLOW}To stop services, run:${NC}"
            echo -e "  kill $PYTHON_PID $NODE_PID"
            
            sleep 10  # Let them start
        else
            wait
        fi
    fi
elif [ "$PYTHON_ONLY" = true ]; then
    start_python
elif [ "$NODE_ONLY" = true ]; then
    start_node
fi

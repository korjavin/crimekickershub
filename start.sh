#!/bin/bash

# Crime Kickers Hub - Start Script
# Starts both backend (Go) and frontend (Vite) servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Crime Kickers Hub...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}🛑 Stopping servers...${NC}"
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend (Go server on port 8080)
echo -e "${YELLOW}📦 Starting backend server...${NC}"
go run cmd/server/main.go &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started on http://localhost:8080${NC}"

# Wait for backend to be ready
sleep 2

# Start Frontend (Vite dev server on port 5173)
echo -e "${YELLOW}🎨 Starting frontend server...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started on http://localhost:5173${NC}"

echo ""
echo -e "${GREEN}🎉 All servers running!${NC}"
echo -e "   Backend: http://localhost:8080"
echo -e "   Frontend: http://localhost:5173"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for both processes
wait

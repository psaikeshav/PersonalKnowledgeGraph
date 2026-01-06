#!/bin/bash

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    # Kill all child processes
    pkill -P $$
    exit
}

# Trap Ctrl+C (SIGINT) and exit
trap cleanup SIGINT SIGTERM EXIT

echo "🚀 Starting Personal Knowledge Graph Assistant..."

# 1. Start Database Services
if [ -f "docker-compose.yml" ]; then
    echo "📦 Starting Databases (Neo4j & ChromaDB)..."
    docker-compose up -d
else
    echo "⚠️  docker-compose.yml not found. Skipping database start."
fi

# 2. Start Backend
echo "🐍 Starting Backend (FastAPI)..."
cd backend || exit
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  Virtual environment 'venv' not found in backend/."
fi

# Use --reload-exclude to avoid restart loop on uploads
uvicorn app.main:app --reload --reload-exclude "uploads" --port 8000 &
BACKEND_PID=$!
cd ..

# 3. Start Frontend
echo "⚛️  Starting Frontend (Next.js)..."
cd frontend || exit
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ App is running!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend:  http://localhost:8000/docs"
echo "   - Graph:    http://localhost:3000/graph"
echo "   - neo4j:    http://localhost:7474"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

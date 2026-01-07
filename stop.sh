#!/bin/bash

echo "🛑 Stopping Personal Knowledge Graph services..."

# Stop Docker containers
echo "Stopping Docker containers..."
docker-compose down 2>/dev/null || true

# Kill Python backend (port 8000)
echo "Stopping backend server (port 8000)..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Kill Node.js frontend (port 3000)
echo "Stopping frontend server (port 3000)..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Kill any other app-related ports
echo "Stopping Neo4j ports (7474, 7687)..."
lsof -ti:7474 | xargs kill -9 2>/dev/null || true
lsof -ti:7687 | xargs kill -9 2>/dev/null || true

echo "Stopping additional services (port 8001)..."
lsof -ti:8001 | xargs kill -9 2>/dev/null || true

echo "✅ All services stopped!"

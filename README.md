# Personal Knowledge Graph Assistant

A production-ready web application for personal knowledge management using LLMs and GraphRAG architecture.

## Architecture

```
User → Web UI → Backend API → LLM Processing → Knowledge Graph (Neo4j) + Vector Store → GraphRAG → Answer
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.10+
- Google Gemini API Key (get it from https://aistudio.google.com/app/apikey)

### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts Neo4j (localhost:7474) and ChromaDB.

### 2. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

Create `.env` files:

**backend/.env**
```
GOOGLE_API_KEY=your-gemini-api-key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Features

- **Document Upload**: PDF, DOCX, TXT support
- **Entity Extraction**: LLM-powered knowledge extraction
- **Knowledge Graph**: Interactive Neo4j visualization
- **GraphRAG**: Hybrid retrieval with multi-hop reasoning
- **Explainable Answers**: Reasoning paths and source citations

## Project Structure

```
├── frontend/          # Next.js application
├── backend/           # FastAPI application
├── docker-compose.yml # Container orchestration
└── README.md
```

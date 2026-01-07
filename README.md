# Personal Knowledge Graph Assistant

A production-ready web application for personal knowledge management using LLMs and GraphRAG architecture. Upload documents, extract knowledge, build a graph, and query your personal knowledge base with explainable multi-hop reasoning.

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Python](https://img.shields.io/badge/Python-3.10+-green)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal)
![Neo4j](https://img.shields.io/badge/Neo4j-5.15-blue)

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────────────────────────────────┐
│   Next.js   │───▶│   FastAPI       │───▶│  Processing Pipeline                     │
│   Frontend  │    │   Backend       │    │  ┌─────────┐  ┌────────┐  ┌───────────┐  │
│             │◀───│                 │◀───│  │ Chunker │─▶│  LLM   │─▶│ Extractor │  │
└─────────────┘    └─────────────────┘    │  └─────────┘  │ (Groq) │  └───────────┘  │
                                          │               └────────┘                  │
                   ┌─────────────────┐    └──────────────────────────────────────────┘
                   │   ChromaDB      │◀──────────────────────────────────────────────┐
                   │   (Vectors)     │                                               │
                   └─────────────────┘                                               │
                                                                                     │
                   ┌─────────────────┐    ┌──────────────────────────────────────────┐
                   │     Neo4j       │◀───│  GraphRAG Engine                         │
                   │ (Knowledge      │    │  • Vector similarity search              │
                   │   Graph)        │    │  • Multi-hop graph traversal             │
                   └─────────────────┘    │  • Hybrid retrieval + LLM reasoning      │
                                          └──────────────────────────────────────────┘
```

## ✨ Features

### Document Processing
- **Multi-format Support**: Upload PDF, DOCX, and TXT files
- **Intelligent Chunking**: Automatic text segmentation with configurable overlap
- **Background Processing**: Async pipeline for large documents

### Knowledge Extraction
- **LLM-Powered Extraction**: Uses Groq (Llama 3.3 70B) for entity and relationship extraction
- **Entity Types**: Person, Organization, Location, Concept, Event, Technology, Product, Document
- **Relationship Mapping**: Automatic detection of connections between entities

### Knowledge Graph
- **Interactive Visualization**: D3.js-powered graph explorer
- **Entity Filtering**: Filter nodes by type
- **Relationship Details**: View connection properties

### GraphRAG Query Engine
- **Hybrid Retrieval**: Combines vector similarity search with graph traversal
- **Multi-hop Reasoning**: Navigate relationships for complex queries
- **Three Query Modes**:
  - `vector`: Semantic similarity search only
  - `graph`: Knowledge graph traversal only
  - `hybrid`: Combined GraphRAG (recommended)
- **Explainable Answers**: Reasoning paths and source citations

### AI File Explorer
- **Natural Language Search**: Find files using semantic queries
- **Smart Ranking**: Combines semantic, entity, and graph scores
- **File Preview**: View matched content snippets

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+
- Python 3.10+
- Groq API Key (get it from https://console.groq.com/keys)

### Option 1: One-Command Start

```bash
chmod +x start.sh
./start.sh
```

This script starts all services (databases, backend, frontend) automatically.

### Option 2: Manual Setup

#### 1. Start Infrastructure

```bash
docker-compose up -d
```

This starts:
- **Neo4j**: http://localhost:7474 (Browser) | bolt://localhost:7687
- **ChromaDB**: http://localhost:8001

#### 2. Start Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Backend API: http://localhost:8000  
API Docs: http://localhost:8000/docs

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## ⚙️ Environment Variables

Create `.env` files:

**backend/.env**
```env
# LLM Provider (Groq - Llama 3.3 70B)
GROQ_API_KEY=your-groq-api-key

# Neo4j Graph Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# ChromaDB Vector Store
CHROMA_HOST=localhost
CHROMA_PORT=8001
```

**frontend/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📁 Project Structure

```
├── frontend/                    # Next.js 14 Application
│   ├── src/app/
│   │   ├── page.tsx            # Home page with dashboard
│   │   ├── upload/             # Document upload interface
│   │   ├── graph/              # Knowledge graph visualization
│   │   ├── query/              # GraphRAG query interface
│   │   └── files/              # AI file explorer
│   └── package.json
│
├── backend/                     # FastAPI Application
│   ├── app/
│   │   ├── main.py             # Application entry point
│   │   ├── api/                # API Endpoints
│   │   │   ├── upload.py       # File upload & processing
│   │   │   ├── graph.py        # Graph operations
│   │   │   ├── query.py        # GraphRAG queries
│   │   │   ├── files.py        # AI file search
│   │   │   └── admin.py        # Admin operations
│   │   ├── services/           # Business Logic
│   │   │   ├── document_processor.py  # Text extraction & chunking
│   │   │   ├── entity_extractor.py    # LLM entity extraction
│   │   │   └── graph_rag.py           # GraphRAG engine
│   │   ├── database/           # Database Clients
│   │   │   ├── neo4j_client.py        # Neo4j operations
│   │   │   └── vector_store.py        # ChromaDB operations
│   │   └── models/             # Pydantic Schemas
│   │       └── schemas.py
│   ├── uploads/                # Uploaded files storage
│   └── requirements.txt
│
├── docker-compose.yml          # Neo4j & ChromaDB containers
├── start.sh                    # One-command startup script
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload document for processing |
| `GET` | `/api/upload/status/{doc_id}` | Get processing status |
| `GET` | `/api/graph` | Get knowledge graph data |
| `GET` | `/api/graph/entity/{id}` | Get entity details |
| `POST` | `/api/query` | Execute GraphRAG query |
| `GET` | `/api/files` | List all uploaded files |
| `POST` | `/api/files/search` | AI-powered file search |
| `GET` | `/health` | Health check |

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **D3.js** - Graph visualization
- **Lucide React** - Icons

### Backend
- **FastAPI** - High-performance Python API
- **Pydantic** - Data validation
- **Groq** - LLM provider (Llama 3.3 70B)
- **Sentence Transformers** - Embeddings
- **PyPDF2 / python-docx** - Document parsing

### Databases
- **Neo4j 5.15** - Graph database with APOC plugin
- **ChromaDB** - Vector store for embeddings


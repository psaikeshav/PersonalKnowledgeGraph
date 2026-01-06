"""
Personal Knowledge Graph Assistant - FastAPI Backend
Main application entry point with CORS and API router registration.
"""

from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import upload, graph, query, admin

# Initialize FastAPI app
app = FastAPI(
    title="Personal Knowledge Graph Assistant",
    description="A GraphRAG-powered knowledge management system",
    version="1.0.0"
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(graph.router, prefix="/api", tags=["Graph"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(admin.router, prefix="/api", tags=["Admin"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Personal Knowledge Graph Assistant",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "components": {
            "api": "operational",
            "neo4j": "check /api/graph/health",
            "vector_store": "check /api/query/health"
        }
    }

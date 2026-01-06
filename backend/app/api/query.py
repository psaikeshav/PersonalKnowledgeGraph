"""
Query API Endpoints
Handles GraphRAG queries and answer generation.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models.schemas import (
    QueryRequest, QueryResponse, QueryMode,
    ReasoningStep, Evidence, GraphData
)
from app.services.graph_rag import graph_rag_engine
from app.database.vector_store import vector_store


router = APIRouter()


@router.post("/query", response_model=QueryResponse)
async def execute_query(request: QueryRequest):
    """
    Execute a GraphRAG query.
    
    Combines:
    - Vector similarity search (semantic)
    - Knowledge graph traversal (structural)
    - Multi-hop reasoning
    - LLM answer generation
    
    Query Modes:
    - vector: Only semantic similarity search
    - graph: Only knowledge graph traversal  
    - hybrid: Combined GraphRAG (recommended)
    """
    try:
        # Execute GraphRAG query
        result = graph_rag_engine.query(
            question=request.question,
            mode=request.mode.value,
            top_k=request.top_k,
            max_hops=request.max_hops
        )
        
        # Format reasoning path
        reasoning_path = [
            ReasoningStep(**step) for step in result.get("reasoning_path", [])
        ]
        
        # Format evidence
        evidence = [
            Evidence(**ev) for ev in result.get("evidence", [])
        ]
        
        # Format graph context
        graph_context = result.get("graph_context", {"nodes": [], "edges": [], "stats": {}})
        
        return QueryResponse(
            question=result["question"],
            answer=result["answer"],
            reasoning_path=reasoning_path,
            evidence=evidence,
            graph_context=GraphData(**graph_context),
            mode_used=QueryMode(result["mode_used"]),
            processing_time_ms=result["processing_time_ms"]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-answer")
async def generate_answer(
    question: str,
    context: Optional[str] = None,
    include_graph: bool = True
):
    """
    Generate an answer for a question with optional context.
    
    This is a simpler endpoint for direct answer generation
    without full GraphRAG pipeline.
    """
    try:
        # Use hybrid mode by default
        result = graph_rag_engine.query(
            question=question,
            mode="hybrid" if include_graph else "vector",
            top_k=5,
            max_hops=2
        )
        
        return {
            "question": question,
            "answer": result["answer"],
            "sources_used": len(result.get("evidence", [])),
            "entities_found": len(result.get("graph_context", {}).get("nodes", []))
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query/health")
async def query_health():
    """Check vector store connection health"""
    is_healthy = vector_store.health_check()
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "database": "chromadb"
    }


@router.get("/query/stats")
async def query_stats():
    """Get query-related statistics"""
    try:
        vector_stats = vector_store.get_stats()
        return {
            "total_chunks_indexed": vector_stats.get("total_chunks", 0),
            "vector_store": "chromadb"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

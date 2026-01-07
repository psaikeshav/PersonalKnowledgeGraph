"""
Pydantic models for API requests and responses.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================

class QueryMode(str, Enum):
    """Query mode for GraphRAG"""
    VECTOR = "vector"
    GRAPH = "graph"
    HYBRID = "hybrid"


class PipelineStage(str, Enum):
    """Document processing pipeline stages"""
    UPLOADED = "uploaded"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    GRAPHING = "graphing"
    COMPLETE = "complete"
    ERROR = "error"


# ============================================================
# Document Models
# ============================================================

class DocumentInfo(BaseModel):
    """Document metadata"""
    id: str
    filename: str
    file_type: str
    upload_date: datetime
    status: PipelineStage
    chunk_count: int = 0
    entity_count: int = 0


class ChunkInfo(BaseModel):
    """Text chunk information"""
    id: str
    text: str
    doc_id: str
    chunk_index: int
    embedding_id: Optional[str] = None


# ============================================================
# Entity and Relationship Models
# ============================================================

class Entity(BaseModel):
    """Knowledge graph entity"""
    id: str
    name: str
    type: str
    properties: Dict[str, Any] = {}
    source_doc: str
    chunk_id: str


class Relationship(BaseModel):
    """Knowledge graph relationship"""
    id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    properties: Dict[str, Any] = {}
    source_doc: str
    chunk_id: str


class ExtractionResult(BaseModel):
    """Result of entity/relationship extraction"""
    entities: List[Entity]
    relationships: List[Relationship]
    doc_id: str
    chunk_id: str


# ============================================================
# Graph Models
# ============================================================

class GraphNode(BaseModel):
    """Node for graph visualization"""
    id: str
    name: str
    type: str
    source_doc: Optional[str] = None
    properties: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    """Edge for graph visualization"""
    id: str
    source: str
    target: str
    relationship: str
    properties: Dict[str, Any] = {}


class GraphData(BaseModel):
    """Complete graph data for visualization"""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: Dict[str, int] = {}


# ============================================================
# Query Models
# ============================================================

class QueryRequest(BaseModel):
    """Query request from user"""
    question: str = Field(..., description="Natural language question")
    mode: QueryMode = Field(default=QueryMode.HYBRID, description="Query mode")
    top_k: int = Field(default=5, description="Number of results to retrieve")
    max_hops: int = Field(default=2, description="Maximum graph traversal hops")


class ReasoningStep(BaseModel):
    """A step in the reasoning path"""
    step_number: int
    description: str
    entities_involved: List[str]
    relationships_used: List[str]
    evidence: str


class Evidence(BaseModel):
    """Evidence supporting the answer"""
    source_doc: str
    chunk_text: str
    relevance_score: float
    entities: List[str]


class QueryResponse(BaseModel):
    """Complete query response with answer and reasoning"""
    question: str
    answer: str
    reasoning_path: List[ReasoningStep]
    evidence: List[Evidence]
    graph_context: GraphData
    mode_used: QueryMode
    processing_time_ms: float


# ============================================================
# Upload Models
# ============================================================

class UploadResponse(BaseModel):
    """Response after file upload"""
    doc_id: str
    filename: str
    status: PipelineStage
    message: str


class ProcessingStatus(BaseModel):
    """Current processing status"""
    doc_id: str
    stage: PipelineStage
    progress: float = Field(ge=0, le=100)
    message: str
    details: Dict[str, Any] = {}


# ============================================================
# Build Graph Models
# ============================================================

class BuildGraphRequest(BaseModel):
    """Request to build graph from document"""
    doc_id: str


class BuildGraphResponse(BaseModel):
    """Response after graph building"""
    doc_id: str
    entities_created: int
    relationships_created: int
    status: str


# ============================================================
# File Explorer Models
# ============================================================

class FileInfo(BaseModel):
    """File metadata for listing"""
    file_id: str
    filename: str
    file_type: str
    upload_date: str
    entity_count: int = 0
    status: str = "complete"


class FileSearchRequest(BaseModel):
    """Request for AI file search"""
    query: str = Field(..., description="Natural language search query")
    top_k: int = Field(default=10, description="Number of files to return")
    file_type: Optional[str] = Field(default=None, description="Filter by file type (pdf, docx, txt)")


class FileMatch(BaseModel):
    """A matched file with relevance info"""
    file_id: str
    filename: str
    file_type: str
    upload_date: str
    relevance_score: float
    matched_entities: List[str] = []
    matched_relationships: List[str] = []
    matched_chunks: List[Dict[str, Any]] = []
    explanation: str


class FileSearchResponse(BaseModel):
    """Response from file search"""
    query: str
    total_matches: int
    files: List[FileMatch]

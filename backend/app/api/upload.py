"""
Upload API Endpoints
Handles file uploads and document processing pipeline.
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import Dict, Any
import uuid

from app.models.schemas import (
    UploadResponse, ProcessingStatus, PipelineStage,
    BuildGraphRequest, BuildGraphResponse
)
from app.services.document_processor import document_processor
from app.services.entity_extractor import entity_extractor
from app.database.neo4j_client import neo4j_client
from app.database.vector_store import vector_store


router = APIRouter()

# In-memory store for processing status (use Redis in production)
processing_status: Dict[str, ProcessingStatus] = {}


@router.post("/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Upload a document for processing.
    
    Supported formats: PDF, DOCX, TXT
    
    Pipeline Steps:
    1. Text Extraction
    2. Chunking
    3. Entity & Relationship Extraction (LLM)
    4. Knowledge Graph Creation
    """
    # Validate file type
    allowed_types = ["pdf", "docx", "txt"]
    file_ext = file.filename.split(".")[-1].lower()
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(allowed_types)}"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Process document
        result = document_processor.process_document(content, file.filename)
        doc_id = result["doc_id"]
        
        # Initialize processing status
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.UPLOADED,
            progress=10,
            message="Document uploaded successfully",
            details={"filename": file.filename, "chunks": result["chunk_count"]}
        )
        
        # Start background processing if available
        if background_tasks:
            background_tasks.add_task(
                process_document_pipeline,
                doc_id,
                result["chunks"],
                file.filename
            )
        
        return UploadResponse(
            doc_id=doc_id,
            filename=file.filename,
            status=PipelineStage.UPLOADED,
            message=f"Document uploaded. {result['chunk_count']} chunks created."
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def process_document_pipeline(
    doc_id: str, 
    chunks: list, 
    filename: str
):
    """Background task to process document through full pipeline"""
    try:
        # Update status: Extracting
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.EXTRACTING,
            progress=30,
            message="Extracting entities and relationships...",
            details={"current_chunk": 0, "total_chunks": len(chunks)}
        )
        
        # Extract entities from all chunks
        extractions = entity_extractor.batch_extract(chunks)
        merged = entity_extractor.merge_extractions(extractions)
        
        # Update status: Embedding
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.EMBEDDING,
            progress=60,
            message="Generating embeddings...",
            details={"entities_found": merged["entity_count"]}
        )
        
        # Generate embeddings locally
        try:
            texts = [c["text"] for c in chunks]
            embeddings = vector_store.generate_embeddings(texts)
            
            # Add to ChromaDB with pre-computed embeddings
            vector_store.collection.add(
                ids=[c["id"] for c in chunks],
                embeddings=embeddings,
                documents=texts,
                metadatas=[{
                    "doc_id": c["doc_id"],
                    "chunk_index": c["chunk_index"],
                    "source_doc": filename
                } for c in chunks]
            )
        except Exception as ve:
            print(f"Vector store add failed: {ve}")
        
        # Update status: Building Graph
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.GRAPHING,
            progress=80,
            message="Building knowledge graph...",
            details={"relationships_found": merged["relationship_count"]}
        )
        
        # Create document node
        neo4j_client.create_document(doc_id, filename)
        
        # Create entities and relationships in Neo4j
        for entity in merged["entities"]:
            neo4j_client.create_entity(
                entity_id=entity["id"],
                name=entity["name"],
                entity_type=entity["type"],
                source_doc=entity.get("source_doc", filename),
                chunk_id=entity.get("chunk_id", "")
            )
        
        for rel in merged["relationships"]:
            neo4j_client.create_relationship(
                rel_id=rel["id"],
                source_entity_id=rel["source_entity_id"],
                target_entity_id=rel["target_entity_id"],
                relationship_type=rel["relationship_type"],
                source_doc=rel.get("source_doc", filename),
                chunk_id=rel.get("chunk_id", "")
            )
        
        # Update status: Complete
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.COMPLETE,
            progress=100,
            message="Document processing complete!",
            details={
                "entities_created": merged["entity_count"],
                "relationships_created": merged["relationship_count"],
                "chunks_indexed": len(chunks)
            }
        )
        
    except Exception as e:
        processing_status[doc_id] = ProcessingStatus(
            doc_id=doc_id,
            stage=PipelineStage.ERROR,
            progress=0,
            message=f"Processing failed: {str(e)}",
            details={"error": str(e)}
        )


@router.get("/upload/status/{doc_id}", response_model=ProcessingStatus)
async def get_processing_status(doc_id: str):
    """Get the current processing status for a document"""
    if doc_id not in processing_status:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return processing_status[doc_id]


@router.post("/extract-entities")
async def extract_entities(doc_id: str, chunk_text: str):
    """
    Extract entities and relationships from a single chunk.
    Useful for testing or manual processing.
    """
    try:
        chunk_id = f"{doc_id}_manual_{uuid.uuid4().hex[:8]}"
        result = entity_extractor.extract_from_chunk(
            chunk_text=chunk_text,
            doc_id=doc_id,
            chunk_id=chunk_id,
            source_doc="manual_input"
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/build-graph", response_model=BuildGraphResponse)
async def build_graph(request: BuildGraphRequest):
    """
    Trigger graph building for a processed document.
    This endpoint is for manual graph building after extraction.
    """
    doc_id = request.doc_id
    
    if doc_id not in processing_status:
        raise HTTPException(status_code=404, detail="Document not found")
    
    status = processing_status[doc_id]
    
    return BuildGraphResponse(
        doc_id=doc_id,
        entities_created=status.details.get("entities_created", 0),
        relationships_created=status.details.get("relationships_created", 0),
        status=status.stage.value
    )

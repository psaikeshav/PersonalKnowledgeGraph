"""
AI File Explorer API Endpoints
Search and retrieve uploaded files using GraphRAG + semantic search.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
import os

from app.models.schemas import (
    FileSearchRequest, FileSearchResponse, FileInfo, FileMatch
)
from app.database.neo4j_client import neo4j_client
from app.database.vector_store import vector_store


router = APIRouter()


@router.get("/files", response_model=List[FileInfo])
async def list_files(
    file_type: Optional[str] = Query(None, description="Filter by file type (pdf, docx, txt)")
):
    """
    List all uploaded files with metadata.
    """
    try:
        documents = neo4j_client.get_all_documents()
        
        files = []
        for doc in documents:
            # Get entity count for this document
            entity_count = neo4j_client.get_entity_count_by_doc(doc["id"])
            
            file_info = FileInfo(
                file_id=doc["id"],
                filename=doc.get("filename", "Unknown"),
                file_type=doc.get("file_type", doc.get("filename", "").split(".")[-1].lower()),
                upload_date=doc.get("upload_date", ""),
                entity_count=entity_count,
                status="complete"
            )
            
            # Apply file type filter
            if file_type and file_info.file_type != file_type.lower():
                continue
                
            files.append(file_info)
        
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/files/search", response_model=FileSearchResponse)
async def search_files(request: FileSearchRequest):
    """
    AI-powered file search using GraphRAG.
    
    Combines semantic search over document chunks with knowledge graph
    traversal to find relevant files based on natural language queries.
    """
    try:
        query = request.query
        top_k = request.top_k
        file_type_filter = request.file_type
        
        # Step 1: Semantic search over uploaded chunks
        semantic_results = vector_store.search_by_text(query, top_k=top_k * 3)
        
        # Step 2: Get entities matching the query terms
        matching_entities = neo4j_client.search_entities_by_name(query)
        
        # Step 3: Aggregate scores per file_id
        file_scores = {}
        file_matched_chunks = {}
        file_matched_entities = {}
        
        # Process semantic search results
        for result in semantic_results:
            doc_id = result["metadata"].get("doc_id", "")
            if not doc_id:
                continue
            
            if doc_id not in file_scores:
                file_scores[doc_id] = {
                    "semantic_score": 0.0,
                    "entity_score": 0.0,
                    "graph_score": 0.0
                }
                file_matched_chunks[doc_id] = []
                file_matched_entities[doc_id] = set()
            
            # Add semantic similarity score
            score = result.get("score", 0)
            file_scores[doc_id]["semantic_score"] += score
            
            # Store matched chunk text (limit to first 200 chars)
            chunk_preview = result["text"][:200] + "..." if len(result["text"]) > 200 else result["text"]
            file_matched_chunks[doc_id].append({
                "text": chunk_preview,
                "score": score
            })
        
        # Process matching entities and their related documents
        for entity in matching_entities:
            source_doc = entity.get("source_doc", "")
            doc_id = neo4j_client.get_doc_id_by_filename(source_doc)
            
            if doc_id and doc_id not in file_scores:
                file_scores[doc_id] = {
                    "semantic_score": 0.0,
                    "entity_score": 0.0,
                    "graph_score": 0.0
                }
                file_matched_chunks[doc_id] = []
                file_matched_entities[doc_id] = set()
            
            if doc_id:
                file_scores[doc_id]["entity_score"] += 1.0
                file_matched_entities[doc_id].add(entity["name"])
                
                # Step 4: Graph traversal - find related entities
                neighbors = neo4j_client.get_entity_neighbors(entity["id"], max_depth=2)
                for neighbor in neighbors:
                    neighbor_entity = neighbor.get("entity", {})
                    neighbor_doc = neighbor_entity.get("source_doc", "")
                    neighbor_doc_id = neo4j_client.get_doc_id_by_filename(neighbor_doc)
                    
                    if neighbor_doc_id:
                        if neighbor_doc_id not in file_scores:
                            file_scores[neighbor_doc_id] = {
                                "semantic_score": 0.0,
                                "entity_score": 0.0,
                                "graph_score": 0.0
                            }
                            file_matched_chunks[neighbor_doc_id] = []
                            file_matched_entities[neighbor_doc_id] = set()
                        
                        # Graph relationship score (weighted by distance)
                        distance = neighbor.get("distance", 1)
                        file_scores[neighbor_doc_id]["graph_score"] += 1.0 / distance
                        file_matched_entities[neighbor_doc_id].add(neighbor_entity.get("name", ""))
        
        # Step 5: Calculate final scores and rank files
        ranked_files = []
        max_score = 0.0
        file_raw_scores = {}
        
        for doc_id, scores in file_scores.items():
            # Weighted combination of scores
            final_score = (
                scores["semantic_score"] * 0.5 +  # Semantic similarity
                scores["entity_score"] * 0.3 +     # Entity matches
                scores["graph_score"] * 0.2        # Graph relationships
            )
            file_raw_scores[doc_id] = final_score
            if final_score > max_score:
                max_score = final_score
        
        for doc_id, scores in file_scores.items():
            # Normalize score to 0-1 range
            raw_score = file_raw_scores[doc_id]
            normalized_score = raw_score / max_score if max_score > 0 else 0.0
            
            # Get document info
            doc_info = neo4j_client.get_document(doc_id)
            if not doc_info:
                continue
            
            filename = doc_info.get("filename", "Unknown")
            file_type = filename.split(".")[-1].lower() if "." in filename else "unknown"
            
            # Apply file type filter
            if file_type_filter and file_type != file_type_filter.lower():
                continue
            
            # Get relationships for this file
            relationships = neo4j_client.get_relationships_by_doc(doc_id)
            relationship_types = list(set([r.get("relationship_type", "") for r in relationships]))[:5]
            
            # Only include files with meaningful relevance (at least 20% of top score)
            if normalized_score < 0.2:
                continue
            
            ranked_files.append(FileMatch(
                file_id=doc_id,
                filename=filename,
                file_type=file_type,
                upload_date=doc_info.get("upload_date", ""),
                relevance_score=round(normalized_score, 4),
                matched_entities=list(file_matched_entities.get(doc_id, set()))[:10],
                matched_relationships=relationship_types,
                matched_chunks=file_matched_chunks.get(doc_id, [])[:3],
                explanation=_generate_match_explanation(
                    scores, 
                    list(file_matched_entities.get(doc_id, set())),
                    relationship_types
                )
            ))
        
        # Sort by relevance score
        ranked_files.sort(key=lambda x: x.relevance_score, reverse=True)
        
        # Limit to top_k results
        ranked_files = ranked_files[:top_k]
        
        # If no files meet threshold, return empty with message
        return FileSearchResponse(
            query=query,
            total_matches=len(ranked_files),
            files=ranked_files
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_id}")
async def get_file_info(file_id: str):
    """
    Get detailed information about a specific file.
    """
    try:
        doc = neo4j_client.get_document(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        # Get all entities for this file
        entities = neo4j_client.get_entities_by_doc(file_id)
        
        # Get all relationships for this file
        relationships = neo4j_client.get_relationships_by_doc(file_id)
        
        # Get chunks
        chunks = vector_store.get_chunks_by_doc(file_id)
        
        return {
            "file_id": file_id,
            "filename": doc.get("filename", "Unknown"),
            "file_type": doc.get("filename", "").split(".")[-1].lower(),
            "upload_date": doc.get("upload_date", ""),
            "entity_count": len(entities),
            "relationship_count": len(relationships),
            "chunk_count": len(chunks),
            "entities": entities[:50],  # Limit for response size
            "relationships": relationships[:50]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/files/{file_id}/download")
async def download_file(file_id: str):
    """
    Download the original uploaded file.
    """
    try:
        doc = neo4j_client.get_document(file_id)
        if not doc:
            raise HTTPException(status_code=404, detail="File not found")
        
        filename = doc.get("filename", "")
        
        # Find the file in uploads directory
        uploads_dir = Path("./uploads")
        file_pattern = f"{file_id}_*"
        
        matching_files = list(uploads_dir.glob(file_pattern))
        
        if not matching_files:
            # Try exact filename match
            matching_files = list(uploads_dir.glob(f"*{filename}"))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="File not found on disk")
        
        file_path = matching_files[0]
        
        return FileResponse(
            path=str(file_path),
            filename=filename,
            media_type="application/octet-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _generate_match_explanation(
    scores: dict,
    entities: list,
    relationships: list
) -> str:
    """Generate a human-readable explanation for why a file matched."""
    parts = []
    
    if scores["semantic_score"] > 0:
        parts.append(f"Content similarity: {scores['semantic_score']:.2f}")
    
    if entities:
        entity_str = ", ".join(entities[:3])
        if len(entities) > 3:
            entity_str += f" (+{len(entities) - 3} more)"
        parts.append(f"Matched entities: {entity_str}")
    
    if relationships:
        rel_str = ", ".join(relationships[:3])
        parts.append(f"Related through: {rel_str}")
    
    if scores["graph_score"] > 0:
        parts.append(f"Graph connections found")
    
    return " | ".join(parts) if parts else "Matched based on content"

"""
Graph API Endpoints
Handles knowledge graph operations and visualization data.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from app.models.schemas import GraphData, GraphNode, GraphEdge
from app.database.neo4j_client import neo4j_client


router = APIRouter()


@router.get("/graph", response_model=GraphData)
async def get_graph(
    limit: int = Query(default=100, le=500, description="Maximum nodes to return"),
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type")
):
    """
    Get the knowledge graph for visualization.
    
    Returns nodes (entities) and edges (relationships) formatted for D3.js.
    """
    try:
        # Get entities
        if entity_type:
            entities = neo4j_client.get_entities_by_type(entity_type)
        else:
            entities = neo4j_client.get_all_entities(limit=limit)
        
        # Get relationships
        relationships = neo4j_client.get_all_relationships(limit=limit * 2)
        
        # Format nodes
        nodes = []
        node_ids = set()
        for entity in entities:
            node_id = entity.get("id", "")
            if node_id:
                node_ids.add(node_id)
                nodes.append(GraphNode(
                    id=node_id,
                    name=entity.get("name", "Unknown"),
                    type=entity.get("type", "Entity"),
                    source_doc=entity.get("source_doc"),
                    properties={
                        k: v for k, v in entity.items() 
                        if k not in ["id", "name", "type", "source_doc"]
                    }
                ))
        
        # Format edges (only include if both nodes exist)
        edges = []
        for rel in relationships:
            source = rel.get("source", {})
            target = rel.get("target", {})
            relationship = rel.get("relationship", {})
            
            source_id = source.get("id", "")
            target_id = target.get("id", "")
            
            if source_id in node_ids and target_id in node_ids:
                edges.append(GraphEdge(
                    id=relationship.get("id", f"{source_id}_{target_id}"),
                    source=source_id,
                    target=target_id,
                    relationship=relationship.get("relationship", "RELATES_TO"),
                    properties={
                        k: v for k, v in relationship.items()
                        if k not in ["id", "relationship"]
                    }
                ))
        
        # Get stats
        stats = neo4j_client.get_graph_stats()
        
        return GraphData(
            nodes=nodes,
            edges=edges,
            stats=stats
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/entity/{entity_id}")
async def get_entity_details(entity_id: str):
    """
    Get detailed information about a specific entity.
    Includes connected entities and relationships.
    """
    try:
        entity = neo4j_client.get_entity(entity_id)
        
        if not entity:
            raise HTTPException(status_code=404, detail="Entity not found")
        
        # Get neighbors within 2 hops
        neighbors = neo4j_client.get_entity_neighbors(entity_id, max_depth=2)
        
        return {
            "entity": entity,
            "neighbors": neighbors,
            "neighbor_count": len(neighbors)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/path")
async def find_path(
    source_id: str = Query(..., description="Source entity ID"),
    target_id: str = Query(..., description="Target entity ID"),
    max_depth: int = Query(default=4, le=6, description="Maximum path length")
):
    """
    Find the shortest path between two entities.
    Returns the full path including intermediate nodes and relationships.
    """
    try:
        path = neo4j_client.find_path_between_entities(
            source_id, target_id, max_depth
        )
        
        if not path:
            return {
                "found": False,
                "message": "No path found between entities",
                "path": []
            }
        
        return {
            "found": True,
            "path_length": sum(1 for p in path if p["type"] == "relationship"),
            "path": path
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/stats")
async def get_graph_stats():
    """
    Get statistics about the knowledge graph.
    """
    try:
        stats = neo4j_client.get_graph_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/graph/health")
async def graph_health():
    """Check Neo4j connection health"""
    is_healthy = neo4j_client.health_check()
    return {
        "status": "healthy" if is_healthy else "unhealthy",
        "database": "neo4j"
    }


@router.get("/graph/entity-types")
async def get_entity_types():
    """
    Get all unique entity types in the graph.
    Useful for filtering in the UI.
    """
    try:
        entities = neo4j_client.get_all_entities(limit=1000)
        types = set()
        for entity in entities:
            entity_type = entity.get("type")
            if entity_type:
                types.add(entity_type)
        
        return {"types": sorted(list(types))}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

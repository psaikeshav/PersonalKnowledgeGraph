from fastapi import APIRouter, HTTPException
import os
import glob
from app.database.neo4j_client import neo4j_client
from app.database.vector_store import vector_store

router = APIRouter()

UPLOAD_DIR = "uploads"

@router.delete("/admin/clear")
async def clear_all_data():
    """
    Clear all data from the system:
    1. Delete all nodes/relationships in Neo4j
    2. Clear ChromaDB collection
    3. Delete uploaded files
    """
    try:
        # 1. Clear Neo4j
        neo4j_client.clear_database()
        
        # 2. Clear ChromaDB
        vector_store.clear_collection()
        
        # 3. Delete files
        files = glob.glob(os.path.join(UPLOAD_DIR, "*"))
        for f in files:
            try:
                os.remove(f)
            except Exception as e:
                print(f"Error deleting file {f}: {e}")
                
        return {"status": "success", "message": "All data cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

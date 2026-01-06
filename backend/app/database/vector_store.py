"""
Vector Store Client
Handles vector embeddings storage and similarity search using ChromaDB.
"""

import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings


class VectorStoreClient:
    """ChromaDB client for vector embeddings and similarity search"""
    
    def __init__(self):
        self.host = os.getenv("CHROMA_HOST", "localhost")
        self.port = int(os.getenv("CHROMA_PORT", "8001"))
        self._client = None
        self._collection = None
        self._embedding_function = None
    
    @property
    def client(self):
        """Lazy initialization of ChromaDB client"""
        if self._client is None:
            try:
                # Try to connect to ChromaDB server with longer timeout
                import httpx
                self._client = chromadb.HttpClient(
                    host=self.host,
                    port=self.port,
                    settings=Settings(
                        anonymized_telemetry=False,
                        chroma_client_auth_provider=None
                    )
                )
                # Test connection
                self._client.heartbeat()
            except Exception as e:
                print(f"ChromaDB HTTP connection failed: {e}")
                # Fall back to persistent local client
                self._client = chromadb.PersistentClient(
                    path="./chroma_data",
                    settings=Settings(anonymized_telemetry=False)
                )
        return self._client
    
    @property
    def collection(self):
        """Get or create the main collection"""
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name="knowledge_chunks",
                metadata={"description": "Document chunks for knowledge graph"}
            )
        return self._collection
    
    def health_check(self) -> bool:
        """Check if ChromaDB is connected"""
        try:
            self.client.heartbeat()
            return True
        except Exception:
            return False
    
    # ============================================================
    # Embedding Operations
    # ============================================================
    
    def add_chunks(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ) -> bool:
        """
        Add document chunks with their embeddings to the vector store.
        
        Args:
            chunks: List of chunk dictionaries with 'id', 'text', 'doc_id', 'chunk_index'
            embeddings: List of embedding vectors corresponding to chunks
        """
        try:
            ids = [chunk["id"] for chunk in chunks]
            documents = [chunk["text"] for chunk in chunks]
            metadatas = [
                {
                    "doc_id": chunk["doc_id"],
                    "chunk_index": chunk["chunk_index"],
                    "source_doc": chunk.get("source_doc", "")
                }
                for chunk in chunks
            ]
            
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
            return True
        except Exception as e:
            print(f"Error adding chunks: {e}")
            return False
    
    def search_similar(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks based on query embedding.
        
        Args:
            query_embedding: Query vector
            top_k: Number of results to return
            filter_metadata: Optional metadata filter
        
        Returns:
            List of matching chunks with scores
        """
        try:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                where=filter_metadata,
                include=["documents", "metadatas", "distances"]
            )
            
            chunks = []
            if results["ids"] and results["ids"][0]:
                for i, chunk_id in enumerate(results["ids"][0]):
                    chunks.append({
                        "id": chunk_id,
                        "text": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                        "score": 1 - results["distances"][0][i] if results["distances"] else 1
                    })
            
            return chunks
        except Exception as e:
            print(f"Error searching: {e}")
            return []
    
    def search_by_text(
        self,
        query_text: str,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Search for similar chunks using text query.
        ChromaDB will use its default embedding function.
        
        Args:
            query_text: Text query
            top_k: Number of results to return
        """
        try:
            # Generate embedding locally
            query_embedding = self.generate_embeddings([query_text])[0]
            
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            chunks = []
            if results["ids"] and results["ids"][0]:
                for i, chunk_id in enumerate(results["ids"][0]):
                    chunks.append({
                        "id": chunk_id,
                        "text": results["documents"][0][i] if results["documents"] else "",
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                        "score": 1 - results["distances"][0][i] if results["distances"] else 1
                    })
            
            return chunks
        except Exception as e:
            print(f"Error searching by text: {e}")
            return []
    
    def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific chunk by ID"""
        try:
            results = self.collection.get(
                ids=[chunk_id],
                include=["documents", "metadatas"]
            )
            
            if results["ids"]:
                return {
                    "id": results["ids"][0],
                    "text": results["documents"][0] if results["documents"] else "",
                    "metadata": results["metadatas"][0] if results["metadatas"] else {}
                }
            return None
        except Exception as e:
            print(f"Error getting chunk: {e}")
            return None
    
    def get_chunks_by_doc(self, doc_id: str) -> List[Dict[str, Any]]:
        """Get all chunks for a specific document"""
        try:
            results = self.collection.get(
                where={"doc_id": doc_id},
                include=["documents", "metadatas"]
            )
            
            chunks = []
            if results["ids"]:
                for i, chunk_id in enumerate(results["ids"]):
                    chunks.append({
                        "id": chunk_id,
                        "text": results["documents"][i] if results["documents"] else "",
                        "metadata": results["metadatas"][i] if results["metadatas"] else {}
                    })
            
            return sorted(chunks, key=lambda x: x["metadata"].get("chunk_index", 0))
        except Exception as e:
            print(f"Error getting chunks by doc: {e}")
            return []
    
    def delete_chunks_by_doc(self, doc_id: str) -> bool:
        """Delete all chunks for a specific document"""
        try:
            self.collection.delete(where={"doc_id": doc_id})
            return True
        except Exception as e:
            print(f"Error deleting chunks: {e}")
            return False
    
    def get_stats(self) -> Dict[str, int]:
        """Get collection statistics"""
        try:
            count = self.collection.count()
            return {"total_chunks": count}
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {"total_chunks": 0}
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a list of texts using local SentenceTransformer.
        This runs locally in Python to avoid ChromaDB server timeouts.
        """
        try:
            # Lazy import and initialization
            from sentence_transformers import SentenceTransformer
            
            if self._embedding_function is None:
                # Use a small, fast model
                print("Loading local embedding model (all-MiniLM-L6-v2)...")
                self._embedding_function = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Generate embeddings
            embeddings = self._embedding_function.encode(texts).tolist()
            return embeddings
        except Exception as e:
            print(f"Error generating embeddings: {e}")
            # Fallback to dummy embeddings if model fails
            return [[0.0] * 384 for _ in texts]
            
    def clear_collection(self):
        """Clear all data from the collection"""
        try:
            self.client.delete_collection("knowledge_chunks")
            self._collection = None
        except Exception as e:
            print(f"Error clearing collection: {e}")


            
    def clear_collection(self):
        """Clear all data from the collection"""
        try:
            self.client.delete_collection("knowledge_chunks")
            self._collection = None
        except Exception as e:
            print(f"Error clearing collection: {e}")

# Singleton instance
vector_store = VectorStoreClient()

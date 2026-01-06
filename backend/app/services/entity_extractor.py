"""
Entity Extractor Service
Uses Groq LLM to extract entities and relationships from text chunks.
"""

import os
import json
from typing import List, Dict, Any, Optional
import uuid


class EntityExtractor:
    """Extract entities and relationships from text using Groq (Llama 3)"""
    
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self._client = None
        
        # Entity types for the knowledge graph
        self.entity_types = [
            "Person", "Organization", "Location", "Concept", 
            "Event", "Technology", "Product", "Document"
        ]
    
    @property
    def client(self):
        """Lazy initialization of Groq client"""
        if self._client is None:
            # Robust fetch
            if not self.api_key:
                self.api_key = os.getenv("GROQ_API_KEY", "")
                
            try:
                from groq import Groq
                if self.api_key:
                    self._client = Groq(api_key=self.api_key)
                else:
                    print("Warning: GROQ_API_KEY not found")
            except ImportError:
                print("groq library not installed")
        return self._client
    
    def extract_from_chunk(
        self, 
        chunk_text: str, 
        doc_id: str, 
        chunk_id: str,
        source_doc: str = ""
    ) -> Dict[str, Any]:
        """
        Extract entities and relationships from a single chunk using Groq.
        """
        # Create extraction prompt
        prompt = self._create_extraction_prompt(chunk_text)
        
        try:
            if not self.client:
                raise Exception("Groq client not initialized")
                
            # Call Groq for extraction
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a knowledge extraction engine. Output JSON only."},
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            response_text = completion.choices[0].message.content
            result = json.loads(response_text)
            
            # Enrich with metadata
            return self._enrich_extraction(result, doc_id, chunk_id, source_doc)
            
        except Exception as e:
            print(f"Groq extraction error: {e}")
            # Return mock extraction for demo/fallback
            return self._mock_extraction(chunk_text, doc_id, chunk_id, source_doc)
    
    def _create_extraction_prompt(self, text: str) -> str:
        """Create the extraction prompt for Gemini"""
        return f'''You are a knowledge extraction assistant. Extract entities and relationships from the following text.

ENTITY TYPES: {", ".join(self.entity_types)}

Return a JSON object with this exact structure:
{{
    "entities": [
        {{"name": "entity name", "type": "entity type"}}
    ],
    "relationships": [
        {{"source": "entity1 name", "target": "entity2 name", "relationship": "relationship description"}}
    ]
}}

Rules:
1. Extract only significant entities (skip common words)
2. Normalize entity names (consistent capitalization)
3. Use clear, concise relationship descriptions
4. Each relationship should connect two entities from the entities list

TEXT:
{text}

Return ONLY valid JSON, no additional text.'''
    
    def _enrich_extraction(
        self, 
        extraction: Dict[str, Any], 
        doc_id: str, 
        chunk_id: str,
        source_doc: str
    ) -> Dict[str, Any]:
        """Add IDs and metadata to extracted entities/relationships"""
        
        # Process entities
        entities = []
        entity_name_to_id = {}
        
        for entity in extraction.get("entities", []):
            entity_id = f"entity_{uuid.uuid4().hex[:8]}"
            entity_name_to_id[entity["name"]] = entity_id
            
            entities.append({
                "id": entity_id,
                "name": entity["name"],
                "type": entity.get("type", "Concept"),
                "properties": entity.get("properties", {}),
                "source_doc": source_doc,
                "chunk_id": chunk_id
            })
        
        # Process relationships
        relationships = []
        for rel in extraction.get("relationships", []):
            source_name = rel.get("source", "")
            target_name = rel.get("target", "")
            
            # Only create relationship if both entities exist
            if source_name in entity_name_to_id and target_name in entity_name_to_id:
                rel_id = f"rel_{uuid.uuid4().hex[:8]}"
                relationships.append({
                    "id": rel_id,
                    "source_entity_id": entity_name_to_id[source_name],
                    "target_entity_id": entity_name_to_id[target_name],
                    "relationship_type": rel.get("relationship", "RELATES_TO"),
                    "properties": rel.get("properties", {}),
                    "source_doc": source_doc,
                    "chunk_id": chunk_id
                })
        
        return {
            "entities": entities,
            "relationships": relationships,
            "doc_id": doc_id,
            "chunk_id": chunk_id
        }
    
    def _mock_extraction(
        self, 
        text: str, 
        doc_id: str, 
        chunk_id: str,
        source_doc: str
    ) -> Dict[str, Any]:
        """
        Generate mock extraction when LLM is unavailable.
        Uses simple pattern matching for demo purposes.
        """
        import re
        
        # Simple extraction using capitalized words as entities
        words = text.split()
        entities = []
        entity_names = set()
        
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word)
            if clean_word and clean_word[0].isupper() and len(clean_word) > 2:
                if clean_word not in entity_names:
                    entity_names.add(clean_word)
                    entities.append({
                        "name": clean_word,
                        "type": "Concept"
                    })
        
        # Limit entities
        entities = entities[:10]
        
        # Create simple relationships between consecutive entities
        relationships = []
        entity_list = list(entities)
        for i in range(len(entity_list) - 1):
            relationships.append({
                "source": entity_list[i]["name"],
                "target": entity_list[i + 1]["name"],
                "relationship": "MENTIONED_WITH"
            })
        
        return self._enrich_extraction(
            {"entities": entities, "relationships": relationships},
            doc_id, chunk_id, source_doc
        )
    
    def batch_extract(
        self, 
        chunks: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Extract entities from multiple chunks.
        
        Args:
            chunks: List of chunk dictionaries
        
        Returns:
            List of extraction results
        """
        results = []
        for chunk in chunks:
            result = self.extract_from_chunk(
                chunk_text=chunk["text"],
                doc_id=chunk["doc_id"],
                chunk_id=chunk["id"],
                source_doc=chunk.get("source_doc", "")
            )
            results.append(result)
        
        return results
    
    def merge_extractions(
        self, 
        extractions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Merge extractions from multiple chunks, deduplicating entities.
        """
        all_entities = []
        all_relationships = []
        seen_entity_names = {}
        
        for extraction in extractions:
            for entity in extraction.get("entities", []):
                # Deduplicate by name
                name_lower = entity["name"].lower()
                if name_lower not in seen_entity_names:
                    seen_entity_names[name_lower] = entity["id"]
                    all_entities.append(entity)
            
            for rel in extraction.get("relationships", []):
                all_relationships.append(rel)
        
        return {
            "entities": all_entities,
            "relationships": all_relationships,
            "entity_count": len(all_entities),
            "relationship_count": len(all_relationships)
        }


# Singleton instance
entity_extractor = EntityExtractor()

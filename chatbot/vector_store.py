"""Vector store operations using ChromaDB and OpenRouter embeddings."""

import os
from typing import List, Dict, Any
from .config import OPENROUTER_API_KEY, OPENROUTER_API_BASE, EMBEDDING_MODEL, CHROMA_DIR

import chromadb
import requests

_client = None
_chroma_client = None
_collection = None

def _get_requests_session():
    # Simple function; no persistent session needed
    pass

def _embed_texts(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using OpenRouter."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    url = f"{OPENROUTER_API_BASE}/embeddings"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    batch_size = 100
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i+batch_size]
        resp = requests.post(url, json={"model": EMBEDDING_MODEL, "input": batch}, headers=headers, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        embeddings = [item["embedding"] for item in data["data"]]
        all_embeddings.extend(embeddings)
    return all_embeddings

def _get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=CHROMA_DIR)
        _collection = _chroma_client.get_or_create_collection(name="documents")
    return _collection

def add_document(filename: str, chunks: List[str]):
    """Add a document's chunks to the vector store."""
    if not chunks:
        return
    collection = _get_collection()
    embeddings = _embed_texts(chunks)
    ids = [f"{filename}_{i}" for i in range(len(chunks))]
    metadatas = [{"filename": filename, "chunk": i} for i in range(len(chunks))]
    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=chunks,
        metadatas=metadatas
    )

def query(question: str, top_k: int) -> (List[str], List[Dict[str, Any]]):
    """Query the vector store for relevant chunks."""
    collection = _get_collection()
    embedding = _embed_texts([question])[0]
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        include=["documents", "metadatas", "distances"]
    )
    # results: {'documents': [[...]], 'metadatas': [[...]], 'distances': [[...]]}
    docs = results["documents"][0] if results["documents"] else []
    metas = results["metadatas"][0] if results["metadatas"] else []
    return docs, metas

def reset():
    """Reset the vector store by deleting the collection."""
    global _collection, _chroma_client
    if _collection is not None:
        try:
            _chroma_client.delete_collection(name="documents")
        except Exception:
            pass
        _collection = _chroma_client.get_or_create_collection(name="documents")
    else:
        _collection = _get_collection()

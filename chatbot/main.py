"""FastAPI application for the document Q&A chatbot."""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
import shutil
import os
from typing import List

from chatbot.config import CHUNK_SIZE, CHUNK_OVERLAP, TOP_K
from chatbot.document_processor import extract_text, chunk_text
from chatbot.vector_store import add_document, query, reset as vector_reset
from chatbot.generate import generate_answer

app = FastAPI(title="Company Document Q&A Chatbot")

@app.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    """Upload and index a document."""
    try:
        content_bytes = await file.read()
        text = extract_text(file.filename, content_bytes, file.content_type or "")
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text extracted from document")
        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
        if not chunks:
            raise HTTPException(status_code=400, detail="Document produced no chunks")
        add_document(file.filename, chunks)
        return {"status": "success", "filename": file.filename, "chunks": len(chunks)}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingest failed: {e}")

@app.post("/query")
async def query_endpoint(question: str = Form(...)):
    """Ask a question about the uploaded documents."""
    try:
        docs, metas = query(question, TOP_K)
        if not docs:
            return {"answer": "No relevant information found in the documents.", "sources": []}
        answer = generate_answer(question, docs)
        sources = [meta["filename"] for meta in metas]
        return {"answer": answer, "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")

@app.post("/reset")
async def reset_endpoint():
    """Reset vector store (delete all indexed documents)."""
    try:
        vector_reset()
        return {"status": "reset", "message": "All documents cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Reset failed: {e}")

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# Company Document Q&A Chatbot

A lightweight FastAPI microservice that answers questions based on uploaded company documents using semantic search and LLM generation.

## Features

- Upload PDF, TXT, DOCX files
- Chunking with configurable size and overlap
- Embeddings via OpenRouter (text-embedding-ada-002)
- Vector storage with ChromaDB (persistent)
- Answer generation with OpenRouter LLM (gpt-4o by default)
- Simple REST API
- Optimized for low memory footprint (embeddings and LLM are remote)

## Prerequisites

- Python 3.10+
- OpenRouter API key
- pip

## Setup

1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\\Scripts\\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set `OPENROUTER_API_KEY` (and other optional settings).

4. Run the service:
   ```bash
   python main.py
   # or: uvicorn main:app --reload
   ```
   The API will be available at `http://localhost:8000`.

## API Endpoints

- `POST /ingest` - Upload a document
  - Form field: `file` (the document)
  - Returns: `{"status": "success", "filename": "...", "chunks": N}`

- `POST /query` - Ask a question
  - Form field: `question` (string)
  - Returns: `{"answer": "...", "sources": ["filename1", ...]}`

- `POST /reset` - Clear all indexed documents
  - Returns: `{"status": "reset", "message": "..."}`

- `GET /health` - Health check
  - Returns: `{"status": "ok"}`

## Example Usage

```bash
# Ingest a PDF
curl -X POST "http://localhost:8000/ingest" -H "accept: application/json" -F "file=@/path/to/document.pdf"

# Query
curl -X POST "http://localhost:8000/query" -H "accept: application/json" -F "question=What are the company's opening hours?"

# Reset
curl -X POST "http://localhost:8000/reset" -H "accept: application/json"
```

## Configuration

All settings can be overridden via environment variables:

| Variable          | Default                         | Description |
|-------------------|---------------------------------|-------------|
| `OPENROUTER_API_KEY` | (required)                     | OpenRouter API key |
| `OPENROUTER_API_BASE` | `https://openrouter.ai/api/v1` | API base URL |
| `EMBEDDING_MODEL`     | `text-embedding-ada-002`       | Embedding model ID |
| `LLM_MODEL`           | `gpt-4o`                       | Chat model ID |
| `CHROMA_DIR`          | `./chroma_data`                | ChromaDB persistent directory |
| `CHUNK_SIZE`          | `1000`                         | Text chunk size (characters) |
| `CHUNK_OVERLAP`       | `200`                          | Overlap between chunks |
| `TOP_K`               | `5`                            | Number of retrieved chunks |

## Notes for Raspberry Pi

- This service uses remote APIs for embeddings and LLM, so local memory usage is low.
- ChromaDB storage is lightweight SQLite-based; ensure enough disk space.
- For best performance, ensure stable internet connection.

## License

MIT

import os
from dotenv import load_dotenv

load_dotenv()

# OpenRouter configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_API_BASE = os.getenv("OPENROUTER_API_BASE", "https://openrouter.ai/api/v1")

# Models - use OpenRouter model IDs (e.g., openai/gpt-4o, anthropic/claude-3.5-sonnet)
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-ada-002")
LLM_MODEL = os.getenv("LLM_MODEL", "openai/gpt-4o-mini")

# Vector store
CHROMA_DIR = os.getenv("CHROMA_DIR", "./chroma_data")

# Chunking
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))

# Retrieval
TOP_K = int(os.getenv("TOP_K", 5))

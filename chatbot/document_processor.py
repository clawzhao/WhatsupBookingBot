"""Document processing: extract text from files and chunk it."""

from typing import List
import os

def extract_text(file_path: str, content_bytes: bytes, content_type: str) -> str:
    """Extract text from a document based on file type."""
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf" or content_type == "application/pdf":
        return _extract_pdf(content_bytes)
    elif ext in [".docx", ".doc"] or "word" in content_type:
        return _extract_docx(content_bytes)
    elif ext == ".txt" or content_type == "text/plain":
        return content_bytes.decode("utf-8", errors="ignore")
    else:
        raise ValueError(f"Unsupported file type: {ext or content_type}")

def _extract_pdf(content_bytes: bytes) -> str:
    try:
        from io import BytesIO
        import pypdf
        reader = pypdf.PdfReader(BytesIO(content_bytes))
        texts = []
        for page in reader.pages:
            texts.append(page.extract_text())
        return "\n".join(texts)
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")

def _extract_docx(content_bytes: bytes) -> str:
    try:
        from io import BytesIO
        import docx
        document = docx.Document(BytesIO(content_bytes))
        return "\n".join([para.text for para in document.paragraphs])
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")

def chunk_text(text: str, chunk_size: int, overlap: int) -> List[str]:
    """Split text into chunks with overlap."""
    if not text:
        return []
    chunks = []
    start = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + chunk_size, text_len)
        chunks.append(text[start:end])
        start += chunk_size - overlap
        if start >= text_len:
            break
    return chunks

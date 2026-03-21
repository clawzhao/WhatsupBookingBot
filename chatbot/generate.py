"""Answer generation using OpenRouter LLM."""

from .config import OPENROUTER_API_KEY, OPENROUTER_API_BASE, LLM_MODEL
import requests

def generate_answer(question: str, context_chunks: list) -> str:
    """Generate an answer based on retrieved context."""
    if not OPENROUTER_API_KEY:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    url = f"{OPENROUTER_API_BASE}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }
    context_text = "\n---\n".join(context_chunks)
    system_prompt = (
        "You are a helpful assistant answering questions based on the provided context. "
        "If the answer is not in the context, say you don't know. "
        "Be concise and accurate."
    )
    user_prompt = f"Context:\n{context_text}\n\nQuestion: {question}"
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "temperature": 0.2,
        "max_tokens": 500
    }
    resp = requests.post(url, json=payload, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()

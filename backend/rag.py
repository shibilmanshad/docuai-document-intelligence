"""
rag.py — Retrieval-Augmented Generation + Intent Router

Flow:
  1. get_intent()   → classify question: qa / dashboard / table / workflow
  2. retrieve()     → fetch top-k chunks from ChromaDB
  3. generate_*()   → call LLM with the right system prompt per intent
  4. query_rag()    → orchestrate the above
"""

import json
import requests
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

CHROMA_DIR = "./vectorstore"
TOP_K = 5
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"  # local, no API key needed
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3"

# In-memory chat history per session  {session_id: [messages]}
_history: dict[str, list] = {}

# Cached embeddings instance (avoid reloading the model on every call)
_embeddings = None


# ── Shared helpers ────────────────────────────────────

def _llm_invoke(system_prompt: str, user_message: str) -> str:
    """Call Ollama Llama 3 with a system + user message."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        "stream": False,
        "options": {"temperature": 0},
    }
    resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _llm_invoke_with_history(system_prompt: str, history: list, user_message: str) -> str:
    """Call Ollama with system prompt, chat history, and new user message."""
    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-10:]:
        if isinstance(msg, HumanMessage):
            messages.append({"role": "user", "content": msg.content})
        elif isinstance(msg, AIMessage):
            messages.append({"role": "assistant", "content": msg.content})
    messages.append({"role": "user", "content": user_message})

    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {"temperature": 0},
    }
    resp = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()["message"]["content"]


def _get_embeddings() -> HuggingFaceEmbeddings:
    global _embeddings
    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(model_name=EMBED_MODEL)
    return _embeddings


def _vectorstore() -> Chroma:
    return Chroma(
        persist_directory=CHROMA_DIR,
        embedding_function=_get_embeddings(),
    )


def _retrieve(question: str) -> tuple[str, list]:
    db = _vectorstore()
    results = db.similarity_search_with_score(question, k=TOP_K)

    context_parts = []
    sources = []
    for doc, score in results:
        context_parts.append(doc.page_content)
        meta = doc.metadata
        sources.append({
            "filename": meta.get("filename", meta.get("source", "unknown")),
            "page": meta.get("page"),
            "type": meta.get("type", "text"),
            "score": round(float(score), 3),
        })

    return "\n\n---\n\n".join(context_parts), sources


# ── Intent Router ─────────────────────────────────────

INTENT_PROMPT = """
You are an intent classifier for a document intelligence platform.
Classify the user's question into ONE intent:
- "qa"        → factual answer or explanation
- "dashboard" → metrics, KPIs, numbers, statistics, or summary
- "table"     → data as a table or structured list
- "workflow"  → visualise a process, steps, or SOP as a flowchart

Respond with ONLY valid JSON: {"intent": "qa"}
"""

def get_intent(question: str) -> str:
    q = question.lower()

    if any(word in q for word in [
        "dashboard",
        "kpi",
        "metric",
        "metrics",
        "statistics",
        "chart",
        "revenue",
        "profit"
    ]):
        return "dashboard"

    if any(word in q for word in [
        "table",
        "tabular",
        "spreadsheet",
        "rows",
        "columns"
    ]):
        return "table"

    if any(word in q for word in [
        "workflow",
        "flowchart",
        "process",
        "steps"
    ]):
        return "workflow"

    return "qa"


# ── QA ────────────────────────────────────────────────

QA_PROMPT = """
You are a helpful AI assistant for a document intelligence platform.
Answer using ONLY the provided context. If the answer isn't there, say so.
Be concise and factual.

Context:
{context}
"""

def _qa(question: str, context: str, session_id: str) -> str:
    history = _history.setdefault(session_id, [])
    answer = _llm_invoke_with_history(
        QA_PROMPT.format(context=context),
        history,
        question,
    )
    history.append(HumanMessage(content=question))
    history.append(AIMessage(content=answer))
    return answer


# ── Dashboard ─────────────────────────────────────────

DASHBOARD_PROMPT = """
You are a dashboard generator for a document intelligence platform.
Extract metrics and KPIs from the context and return ONLY this JSON:
{{
  "type": "dashboard",
  "title": "...",
  "cards": [
    {{"title": "...", "value": "...", "change": "...", "trend": "up|down|neutral"}}
  ],
  "chart": {{
    "type": "bar",
    "labels": [...],
    "datasets": [{{"label": "...", "data": [...]}}]
  }}
}}

Context:
{context}
"""

def _dashboard(question: str, context: str) -> dict:
    raw = _llm_invoke(DASHBOARD_PROMPT.format(context=context), question)

    print("\n=== DASHBOARD RAW ===")
    print(raw)
    print("=====================\n")

    # Find JSON object inside response
    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("No JSON found in model response")

    json_text = raw[start:end + 1]

    return json.loads(json_text)


# ── Table ─────────────────────────────────────────────

TABLE_PROMPT = """
Extract data from the context and return ONLY this JSON:
{{
  "type": "table",
  "title": "...",
  "columns": ["Col1", "Col2"],
  "rows": [["val1", "val2"]]
}}

Context:
{context}
"""

def _table(question: str, context: str) -> dict:
    raw = _llm_invoke(TABLE_PROMPT.format(context=context), question)

    print("\n=== TABLE RAW ===")
    print(raw)
    print("=================\n")

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("No JSON found in model response")

    return json.loads(raw[start:end + 1])


# ── Workflow ──────────────────────────────────────────

WORKFLOW_PROMPT = """
Convert the process described in the context into nodes and edges.
Return ONLY this JSON:
{{
  "type": "workflow",
  "title": "...",
  "nodes": [
    {{"id": "1", "label": "Step name", "type": "start|step|decision|end"}}
  ],
  "edges": [
    {{"from": "1", "to": "2", "label": ""}}
  ]
}}

Context:
{context}
"""

def _workflow(question: str, context: str) -> dict:
    raw = _llm_invoke(WORKFLOW_PROMPT.format(context=context), question)

    print("\n=== WORKFLOW RAW ===")
    print(raw)
    print("====================\n")

    start = raw.find("{")
    end = raw.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("No JSON found in model response")

    return json.loads(raw[start:end + 1])

# ── Main Orchestrator ─────────────────────────────────

def query_rag(question: str, intent: str, session_id: str = "default") -> dict:
    context, sources = _retrieve(question)

    if intent == "dashboard":
        try:
            return {"data": _dashboard(question, context), "sources": sources}
        except Exception as e:
            return {"answer": f"Dashboard generation failed: {e}", "sources": sources}

    elif intent == "table":
        try:
            return {"data": _table(question, context), "sources": sources}
        except Exception as e:
            return {"answer": f"Table generation failed: {e}", "sources": sources}

    elif intent == "workflow":
        try:
            return {"data": _workflow(question, context), "sources": sources}
        except Exception as e:
            return {"answer": f"Workflow generation failed: {e}", "sources": sources}

    else:
        return {"answer": _qa(question, context, session_id), "sources": sources}


# ── Document Management ───────────────────────────────

def get_documents() -> list:
    db = _vectorstore()
    results = db.get(include=["metadatas"])
    seen = set()
    docs = []
    for meta in results.get("metadatas", []):
        filename = meta.get("filename", meta.get("source", "unknown"))
        if filename not in seen:
            seen.add(filename)
            docs.append({"filename": filename, "type": meta.get("type", "text")})
    return docs


def delete_document(filename: str):
    db = _vectorstore()
    results = db.get(include=["metadatas"])
    ids_to_delete = [
        id_ for id_, meta in zip(results["ids"], results["metadatas"])
        if meta.get("filename") == filename or meta.get("source", "").endswith(filename)
    ]
    if ids_to_delete:
        db.delete(ids=ids_to_delete)

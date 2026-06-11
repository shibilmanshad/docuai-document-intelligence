# DocuAI — AI-Powered Document Intelligence Platform

A full-stack RAG application that ingests PDFs, DOCX, Excel, and images, then answers
questions with generative UI — auto-generating dashboards, data tables, or workflow
diagrams based on query intent.

**Fully local & free.** Uses Ollama + Llama 3 for LLM/vision and local sentence-transformers for embeddings. No API keys required.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| OCR | pytesseract |
| Embeddings | sentence-transformers/all-MiniLM-L6-v2 |
| Vector DB | ChromaDB |
| RAG | LangChain |
| Backend | FastAPI |
| Frontend | React + Vite |
| LLM | Ollama + Llama 3 |
| Workflow Generation | Llama 3 |
| Dashboard Generation | Llama 3 |
| Table Generation | Llama 3 |

## Architecture

```
Documents (PDF, DOCX, XLSX, Images)
         │
   ┌─────▼────────────────────────────┐
   │   Document Parser (ingest.py)    │
   │   PyMuPDF · OCR · camelot        │
   │   Llama 3 Vision (images)        │
   └─────┬────────────────────────────┘
         │
   ┌─────▼──────────────────┐
   │ RecursiveTextSplitter  │  chunking
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────────────┐
   │  HuggingFace Embeddings        │  vectors (local, no API cost)
   │  all-MiniLM-L6-v2             │
   └─────┬──────────────────────────┘
         │
   ┌─────▼──────────────────┐
   │  ChromaDB (persisted)  │  storage
   └─────┬──────────────────┘
         │
   ┌─────▼──────────────────────────────────┐
   │  Intent Router (rag.py)                │
   │  QA · Dashboard · Table · Workflow     │
   └─────┬──────────────────────────────────┘
         │
   ┌─────▼──────────────────────────────────┐
   │  FastAPI (app.py)                      │
   │  POST /upload · POST /query            │
   └─────┬──────────────────────────────────┘
         │
   ┌─────▼──────────────────────────────────┐
   │  React Frontend                        │
   │  ChatInterface → DashboardWidget       │
   │                → WorkflowWidget        │
   │                → TableWidget           │
   │                → SourceCitations       │
   └────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

Install [Ollama](https://ollama.com) and pull Llama 3:

```bash
ollama pull llama3
```

### 1. Clone and configure

```bash
git clone https://github.com/yourname/docuai
cd docuai
cp .env.example backend/.env
# No API key needed — Ollama runs locally
```

### 2. Run with Docker

```bash
docker-compose up --build
```

Docker Compose will start Ollama, the FastAPI backend, and the React frontend automatically.
Then open http://localhost:3000

### 3. Or run manually

**Ollama** (in a separate terminal)
```bash
ollama serve
```

**Backend**
```bash
cd backend
pip install -r ../requirements.txt
uvicorn app:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## API Reference

### POST /upload
Upload a document file.

```bash
curl -X POST http://localhost:8000/upload \
  -F "file=@report.pdf"
```

Response:
```json
{
  "filename": "report.pdf",
  "chunks_created": 42,
  "tables_extracted": 3,
  "images_described": 2,
  "status": "ingested"
}
```

### POST /query
Ask a question about ingested documents.

```bash
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the total revenue?"}'
```

Response (dashboard intent):
```json
{
  "intent": "dashboard",
  "data": {
    "type": "dashboard",
    "title": "Revenue Overview",
    "cards": [
      {"title": "Revenue", "value": "$1.2M", "change": "+15%", "trend": "up"}
    ],
    "chart": {
      "type": "bar",
      "labels": ["Q1", "Q2", "Q3", "Q4"],
      "datasets": [{"label": "Revenue", "data": [280000, 310000, 295000, 315000]}]
    }
  },
  "sources": [
    {"filename": "annual_report.pdf", "page": 22, "type": "text"}
  ]
}
```

## Configuration

Ollama settings can be overridden via environment variables (or `backend/.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `llama3` | Model to use for all LLM calls |

To swap to a different model (e.g. Mistral):
```bash
ollama pull mistral
# then set OLLAMA_MODEL=mistral in backend/.env
```

## Phases Implemented

- ✅ **Phase 1** — Basic RAG (ChromaDB + LangChain + Llama 3)
- ✅ **Phase 2** — Multi-modal (OCR, table extraction, Llama 3 vision)
- ✅ **Phase 3** — Generative Dashboard UI
- ✅ **Phase 4** — Workflow / SOP diagram generation
- ✅ **Phase 5** — Intent router (QA / Dashboard / Table / Workflow)
- ✅ **Phase 6** — Source citations, chat history, Docker deployment

## Extending

**Add React Flow for interactive workflows:**
```bash
cd frontend && npm install reactflow
```
Then replace `WorkflowWidget.jsx` SVG renderer with `<ReactFlow nodes={...} edges={...} />`.

**Swap embeddings to a higher-quality local model:**
```python
# In rag.py and ingest.py, change EMBED_MODEL:
EMBED_MODEL = "sentence-transformers/all-mpnet-base-v2"  # higher quality, slower
```

**Add authentication:**
```bash
pip install python-jose[cryptography] passlib
```
See FastAPI's JWT auth docs.

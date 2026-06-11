from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import uvicorn

from ingest import ingest_document
from rag import query_rag, get_intent

app = FastAPI(
    title="DocuAI — Document Intelligence Platform",
    description="Multi-modal RAG platform with generative UI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
# Request / Response Models
# ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    question: str
    session_id: str = "default"


class QueryResponse(BaseModel):
    intent: str          # "qa" | "dashboard" | "table" | "workflow"
    answer: str | None = None
    data: dict | None = None
    sources: list[dict] = []


# ─────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "ok", "message": "DocuAI API is running"}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """
    Accept PDF, DOCX, XLSX, or image files.
    Parse, chunk, embed, and store in ChromaDB.
    """
    allowed_types = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "image/png",
        "image/jpeg",
    }
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    # Save to disk
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, file.filename)

    with open(file_path, "wb") as f:
        contents = await file.read()
        f.write(contents)

    # Ingest: parse → chunk → embed → store
    result = ingest_document(file_path, file.content_type)

    return {
        "filename": file.filename,
        "chunks_created": result["chunks"],
        "tables_extracted": result.get("tables", 0),
        "images_described": result.get("images", 0),
        "status": "ingested",
    }


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """
    Route user question through intent classifier,
    then return the appropriate response format.
    """
    intent = get_intent(req.question)
    result = query_rag(req.question, intent, session_id=req.session_id)

    return QueryResponse(
        intent=intent,
        answer=result.get("answer"),
        data=result.get("data"),
        sources=result.get("sources", []),
    )


@app.get("/documents")
async def list_documents():
    """Return all ingested documents from the vector store."""
    from rag import get_documents
    return {"documents": get_documents()}


@app.delete("/documents/{filename}")
async def delete_document(filename: str):
    from rag import delete_document as do_delete
    do_delete(filename)
    return {"deleted": filename}


# ─────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

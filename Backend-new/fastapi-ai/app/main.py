import io
import json
import os
import time
from pathlib import Path
from typing import Literal

import psycopg
import pdfplumber
from psycopg_pool import ConnectionPool
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from pypdf import PdfReader
from contextlib import closing, contextmanager
from sentence_transformers import SentenceTransformer

# --- 1. Environment & Path Setup ---
BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path, override=True)

# --- 2. Configuration Class ---
class Settings(BaseSettings):
    groq_api_key: str = os.getenv("GROQ_API_KEY", "")
    groq_model: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    database_url: str | None = os.getenv("DATABASE_URL")
    postgres_db: str = os.getenv("POSTGRES_DB", "postgres")
    postgres_user: str = os.getenv("POSTGRES_USER", "postgres")
    postgres_password: str = os.getenv("POSTGRES_PASSWORD", "")
    postgres_host: str = os.getenv("POSTGRES_HOST", "localhost")
    postgres_port: int = int(os.getenv("POSTGRES_PORT", 5432))

    @property
    def dsn(self) -> str:
        return self.database_url if self.database_url else (
            f"postgresql://{self.postgres_user}:{self.postgres_password}@"
            f"{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

settings = Settings()

# --- 3. Client & Local Model Initialization ---
print("Loading local embedding model (Native Dimension: 384)...")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
groq_client = Groq(api_key=settings.groq_api_key)

# --- 4. Database Connection Pool Setup ---
pool = ConnectionPool(
    conninfo=settings.dsn,
    min_size=1,
    max_size=10,
    open=True
)

@contextmanager
def get_pool_connection():
    with pool.connection() as conn:
        yield conn

# --- 5. FastAPI Setup ---
app = FastAPI(title="Local Embedding RAG Service", version="0.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 6. Models ---
class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=8000)
    mode: Literal["document", "hybrid", "general"] = "document"
    document_ids: list[int] = Field(default_factory=list, max_length=100)
    max_sources: int = Field(default=4, ge=1, le=20)

class AskResponse(BaseModel):
    answer: str
    confidence: str
    sources: list[dict]

# --- 7. Helper & Advanced Parsing Functions ---
def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"

def make_embedding(text: str) -> list[float]:
    return embed_model.encode(text).tolist()


def parse_text(filename: str, data: bytes) -> tuple[str, list[dict]]:
    """Extract searchable text from a PDF or UTF-8 text file.

    Image-only/scanned PDFs are rejected instead of indexing guessed text.
    OCR is not implemented by this parser.
    """
    if not data:
        raise ValueError("The uploaded file is empty.")

    if filename.lower().endswith(".pdf"):
        try:
            pages = []
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                for page_number, page in enumerate(pdf.pages, start=1):
                    page_text = (page.extract_text() or "").strip()
                    if page_text:
                        pages.append({
                            "page_number": page_number,
                            "text": page_text,
                        })
        except Exception as exc:
            raise ValueError("The PDF could not be read. Please upload a valid PDF.") from exc

        if not pages:
            raise ValueError(
                "No selectable text was found in this PDF. Scanned/image-only PDFs "
                "are not supported by the current parser."
            )
        return "pdf", pages

    try:
        text_data = data.decode("utf-8").strip()
    except UnicodeDecodeError as exc:
        raise ValueError("Only UTF-8 text files and text-based PDFs are supported.") from exc

    if not text_data:
        raise ValueError("The uploaded text file is empty.")
    return "txt", [{"page_number": 1, "text": text_data}]

def chunk_pages(pages: list[dict], chunk_size: int = 700, overlap: int = 100):
    chunks = []
    for page in pages:
        text = page["text"]
        start = 0
        # Ensure that even short document text blocks generate at least 1 chunk!
        if not text:
            continue
        while start < len(text):
            end = min(len(text), start + chunk_size)
            chunks.append({"page_number": page["page_number"], "text": text[start:end]})
            if end >= len(text): break
            start = max(0, end - overlap)
            
    # Guarantee at least one valid operational block
    if not chunks and pages:
        chunks.append({"page_number": 1, "text": pages[0]["text"]})
    return chunks

# --- 8. Core RAG Functions ---
def fetch_sources(question: str, document_ids: list[int], max_sources: int):
    if not document_ids: return []
    
    query_emb = make_embedding(question)
    results = []
    
    with get_pool_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT source_title, chunk_text, page_number,
                       (1 - (embedding <=> %s::vector)) AS score
                FROM rag_chunks
                WHERE document_id = ANY(%s)
                ORDER BY embedding <=> %s::vector ASC
                LIMIT %s
            """, (vector_literal(query_emb), document_ids,
                  vector_literal(query_emb), max_sources))
            
            for row in cur.fetchall():
                results.append({"title": row[0], "text": row[1], "page": row[2], "score": round(float(row[3]), 3)})
    return results

def build_answer(question: str, mode: str, sources: list[dict]):
    # FIX: Allow Hybrid & General Mode processing to run even if vector lookups returned empty lists
    if not sources and mode == "document":
        return "I could not find relevant information in your uploaded documents inside the vector space. Please re-upload to index them fully.", "low"
    
    # Intelligent prompt balancing for modes
    if mode == "general":
        system_prompt = (
            "You are an intelligent AI assistant. Answer the user comprehensively using your "
            "own general knowledge. If the provided document context is relevant to the "
            "question, you may use it to enrich your answer, but you are not limited to it."
        )
        if sources:
            context = "\n\n".join(f"Source: {s['title']} (Page {s['page']})\n{s['text']}" for s in sources)
            user_content = f"Document context (optional, use only if relevant):\n{context}\n\nQuestion: {question}"
        else:
            user_content = question
    elif mode == "hybrid":
        context = "\n\n".join(f"Source: {s['title']} (Page {s['page']})\n{s['text']}" for s in sources)
        system_prompt = "You are a professional assistant blending document retrieval and general logic. Answer using the context if helpful, otherwise fallback to general knowledge."
        user_content = f"Context from documents:\n{context}\n\nQuestion: {question}\n\nIf the answer is not in the context, please answer using general knowledge but state clearly that it wasn't found in your localized documents."
    else:  # strict document only mode
        context = "\n\n".join(f"Source: {s['title']} (Page {s['page']})\n{s['text']}" for s in sources)
        system_prompt = "You are a professional assistant. Answer strictly based on the provided document context fragments. Do not invent details outside the document framework."
        user_content = f"Context:\n{context}\n\nQuestion: {question}"
    
    try:
        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content}
            ],
            model=settings.groq_model,
            temperature=0.2 if mode == "document" else 0.6,
        )
        return completion.choices[0].message.content, "high" if sources else "medium"
    except Exception as e:
        print(f"GROQ ERROR: {e}")
        return "The backend Groq AI orchestration engine is currently unavailable.", "error"

# --- 9. API Routes ---
@app.post("/documents/import")
async def import_document(file: UploadFile = File(...), document_id: int = Form(...), title: str = Form(...)):
    print(f"Indexing Request Received: ID={document_id}, Title={title}...")
    data = await file.read()
    try:
        file_type, pages = parse_text(file.filename or "upload.txt", data)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    chunks = chunk_pages(pages)

    print(f"DEBUG: Processing {len(chunks)} text chunks to database...")

    with get_pool_connection() as conn:
        with conn.cursor() as cur:
            # Drop old entries to clear up space cleanly
            cur.execute("DELETE FROM rag_chunks WHERE document_id = %s", (document_id,))
            for i, chunk in enumerate(chunks):
                emb = make_embedding(chunk["text"])
                cur.execute("""
                    INSERT INTO rag_chunks (document_id, source_title, chunk_index, page_number, chunk_text, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (document_id, title, i, chunk["page_number"], chunk["text"], vector_literal(emb)))
        conn.commit()
    
    print(f"Successfully chunked, embedded, and indexed {len(chunks)} records in vector storage.")
    return {"status": "indexed", "chunks": len(chunks)}

@app.delete("/documents/{document_id}", status_code=204)
async def delete_document_chunks(document_id: int):
    """Remove all indexed chunks for a document."""
    with get_pool_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM rag_chunks WHERE document_id = %s",
                (document_id,),
            )
        conn.commit()
    return None


@app.post("/ask", response_model=AskResponse)
async def ask(payload: AskRequest):
    sources = fetch_sources(payload.question, payload.document_ids, payload.max_sources)
    answer, confidence = build_answer(payload.question, payload.mode, sources)
    return {"answer": answer, "confidence": confidence, "sources": sources}

@app.on_event("shutdown")
def shutdown_event():
    pool.close()
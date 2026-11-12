# RAG Pipeline

This document describes the behavior visible in the current FastAPI source. It does not imply OCR, reranking, hybrid lexical retrieval, or evaluation features that are not implemented.

## 1. Ingestion

The FastAPI import endpoint receives a file plus a document ID and title.

### Parsing

- PDF files are passed through `pdfplumber` page extraction.
- If normal PDF text extraction yields no pages, the code attempts a raw-byte/string fallback.
- If PDF extraction fails, it attempts UTF-8 decoding and cleanup, and may return a fallback explanatory text.
- Non-PDF files are decoded as UTF-8 text.

**Important:** raw byte/string recovery is not OCR and cannot reliably read scanned page images. A package listed in `requirements.txt` does not establish that a parser is actually called.

### Chunking

The current helper uses character-based chunks:

- Chunk size: 700 characters
- Overlap: 100 characters
- Page number is retained with each chunk.

Character-based splitting is simple, but it can split sentences or semantic units. A future improvement would be token-aware or structure-aware chunking with tests across document types.

## 2. Embedding generation

The code loads the Sentence Transformers model `all-MiniLM-L6-v2` and calls it to encode chunk text and user questions.

The expected vector size is 384 dimensions, matching the database vector column configured by this project. Verify the model output dimension directly rather than relying on silent truncation or padding; model and schema dimensions must agree.

## 3. Vector storage and retrieval

Chunk records are stored in PostgreSQL with pgvector. The records include document ID, source title, chunk index, page number, chunk text, and embedding.

At question time:

1. Embed the question using the same embedding model.
2. Search chunks for the selected document IDs.
3. Rank results using vector similarity.
4. Select up to the requested source limit.
5. Use the selected chunks as context for answer generation.

The exact distance operator, SQL, and filtering behavior are defined by `Backend-new/fastapi-ai/app/main.py`. Review query parameterization and document ownership checks before exposing the service publicly.

## 4. Answer generation

The FastAPI service sends the question and retrieved context to the configured Groq chat model. The model response is returned to the frontend with source metadata.

The Groq model name is configurable. Model availability changes over time, so check the current Groq model catalogue before using a model name in a new deployment. The model name in a local `.env` must match an available model.

## 5. Sources and confidence

The API returns source information that the UI can render as citations. A displayed similarity score represents retrieval similarity, not proof that the generated answer is correct.

Do not describe the current `confidence` field as a calibrated probability unless a validation/calibration method is implemented and evaluated.

## 6. Modes shown in the UI

The frontend presents Document only, Hybrid, and General AI options. Treat these as UI-level mode labels until each mode's backend behavior has been independently verified. In particular, do not claim a separate web-search or lexical hybrid retriever unless that logic is present.

## 7. Recommended evaluation work

Build a small, manually reviewed question-answer dataset with expected source passages. Measure retrieval and answer quality separately.

| Metric | What it measures |
|---|---|
| Precision@K | Fraction of top-K retrieved chunks that are relevant |
| Recall@K | Fraction of relevant chunks found in top K |
| MRR | Rank of the first relevant result |
| Faithfulness | Whether answer claims are supported by retrieved context |
| Citation correctness | Whether cited passages actually support the associated claims |
| Answer relevance | Whether the answer addresses the question |

Record dataset size, annotation process, model/version, chunking settings, retrieval settings, and results. Never invent evaluation scores.

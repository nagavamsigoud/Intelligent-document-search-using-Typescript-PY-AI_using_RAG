# Architecture Decision Log

This log records architectural choices visible in the current project. It separates implemented choices from possible future improvements. It is not a claim that every alternative was benchmarked.

## ADR-001: Separate application API and AI service

**Status:** Implemented in the repository.

**Decision:** Use Django REST Framework for user/account and application data APIs, and FastAPI for AI-oriented operations.

**Reasoning:** Keeps authentication/document CRUD concerns separate from parsing, embedding, retrieval, and LLM orchestration.

**Trade-off:** Requires coordination between two backend services, including URL configuration, error handling, authentication, and data consistency.

**Alternatives to evaluate:** Keep all APIs in Django; use FastAPI for the entire backend; introduce a dedicated worker service for ingestion.

## ADR-002: Use local Sentence Transformers embeddings

**Status:** Implemented in the repository.

**Decision:** Use `sentence-transformers` with `all-MiniLM-L6-v2` to encode document chunks and questions locally.

**Reasoning:** Avoids an external embedding API call and its per-request cost for embedding generation.

**Trade-off:** The model must be downloaded/loaded and consumes application memory and CPU. Retrieval quality depends on the embedding model and domain.

**Alternatives to evaluate:** Hosted embedding APIs, larger local embedding models, multilingual embedding models. Compare quality, latency, cost, and dimension compatibility before switching.

## ADR-003: Store vectors in PostgreSQL with pgvector

**Status:** Implemented in the repository.

**Decision:** Store chunk metadata and vector embeddings in PostgreSQL using pgvector.

**Reasoning:** Keeps application records and vector search in one database technology and allows relational metadata filtering.

**Trade-off:** Requires pgvector extension/schema management and appropriate vector indexes. Performance must be measured at realistic data sizes.

**Alternatives to evaluate:** Dedicated vector database or hybrid database/vector architecture.

## ADR-004: Character-based chunking

**Status:** Implemented in the repository.

**Decision:** Split extracted page text into chunks of approximately 700 characters with 100 characters of overlap.

**Reasoning:** Straightforward initial chunking approach that preserves some context between adjacent chunks.

**Trade-off:** Character count is not token count; chunks may split sentences, headings, tables, or semantic units.

**Alternatives to evaluate:** Token-aware chunking, paragraph/heading-aware chunking, recursive splitting, and document-layout-aware extraction. Compare retrieval metrics on a labeled dataset.

## ADR-005: Groq for answer generation

**Status:** Implemented in the repository.

**Decision:** Call a Groq-hosted chat model to generate an answer from retrieved context.

**Reasoning:** Separates answer generation from local embedding and database retrieval.

**Trade-off:** Requires network access and a valid provider key; availability, model names, latency, rate limits, and pricing can change.

**Alternatives to evaluate:** Other hosted providers or a self-hosted model, comparing answer quality, latency, reliability, and cost.

## ADR-006: Browser-initiated document indexing

**Status:** Implemented in the current workflow.

**Decision:** The frontend creates the Django document record and then initiates the FastAPI import request.

**Reasoning:** Simple request flow for an initial full-stack project.

**Trade-off:** The browser coordinates two backend requests. If the browser closes or the second request fails, metadata and vector index state can diverge.

**Future proposal:** Move ingestion to a durable background job queue with retries, idempotency, and observable job status.

## ADR-007: Add a measurable RAG evaluation suite

**Status:** Proposed; not represented as an existing completed feature.

**Proposal:** Create a labeled evaluation dataset and report Precision@K, Recall@K, MRR, faithfulness, answer relevance, and citation correctness.

**Reasoning:** Interview-quality engineering decisions should be supported by reproducible measurements rather than subjective examples.

**Acceptance criteria:** Versioned test set, documented annotation rules, repeatable evaluation script, model/config metadata, and reported results.

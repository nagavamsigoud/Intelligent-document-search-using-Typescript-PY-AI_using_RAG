# Interview Preparation

Use this document to explain the project accurately. Be clear about what is implemented, what is a limitation, and what you would improve next.

## 60-second project explanation

"I built an Intelligent Document Search application using a Retrieval-Augmented Generation architecture. The frontend is React and TypeScript. Django REST Framework manages user accounts, JWT authentication, document metadata, chat history, and exports. A separate FastAPI service handles document text extraction, chunking, local embeddings, vector retrieval through PostgreSQL and pgvector, and answer generation through a Groq-hosted language model. The API returns source information with the answer so the UI can display supporting document passages."

## Explain the RAG pipeline

1. **Ingestion:** receive the uploaded file and document ID.
2. **Parsing:** extract text and page information from the supported PDF path; plain text is decoded as text.
3. **Chunking:** split text into overlapping chunks.
4. **Embedding:** encode chunks with `all-MiniLM-L6-v2`.
5. **Storage:** save chunk metadata and vectors in PostgreSQL/pgvector.
6. **Retrieval:** embed the question and retrieve similar chunks for selected document IDs.
7. **Generation:** send question plus retrieved context to the Groq chat model.
8. **Citation display:** return source metadata so the frontend can show the retrieved passages.

## Questions to prepare for

### Why use RAG instead of sending an entire document to an LLM?

RAG retrieves a smaller set of relevant passages for a question. It can reduce prompt size and make it easier to show which document passages informed the answer. It does not automatically guarantee factual correctness.

### Why use embeddings?

Embeddings represent text as numerical vectors. Similarity search can find semantically related passages even when the question and passage do not use exactly the same words.

### Why use pgvector?

It adds vector storage and similarity search to PostgreSQL, which the application already uses for relational data.

### Why overlap chunks?

Overlap can preserve some context at boundaries so a relevant sentence split across adjacent chunks is less likely to lose its surrounding meaning.

### What is a limitation of the current chunking approach?

It uses character lengths rather than tokens or document structure. It may split a sentence, heading, or table. A future version could use token-aware, recursive, or layout-aware chunking and compare retrieval metrics.

### How would you evaluate retrieval?

Build questions with labeled supporting passages, then measure Precision@K, Recall@K, and MRR. Evaluate generated answers separately for faithfulness, relevance, and citation correctness.

### What would you improve before production?

Prioritize FastAPI authentication and per-user document authorization, SQL parameterization, upload validation and limits, robust OCR/parser support, background ingestion, automated tests, observability, and production configuration.

## Be honest about current limitations

- The scanned-PDF byte fallback is not OCR.
- DOCX in the Python requirements does not prove that DOCX parsing is implemented.
- UI mode labels should not be described as distinct retrieval strategies without verifying backend behavior.
- A similarity score is not a calibrated answer-confidence probability.
- Do not claim benchmark accuracy or production scale without measured results.

## Demonstration checklist

- Use a small, non-sensitive sample PDF with selectable text.
- Prepare 3–5 questions whose answers are clearly present in the document.
- Show the source passage/page returned for each question.
- Show chat history and CSV/PDF export.
- Explain one failure case and how you would improve it.
- Be ready to describe the data flow between React, Django, FastAPI, PostgreSQL, pgvector, Sentence Transformers, and Groq.

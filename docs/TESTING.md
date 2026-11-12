# Testing Strategy

## Current state

This document defines a practical test plan. Do not interpret the checklist as evidence that the tests have already been written or passed. Run the checks locally and record actual results before adding badges or test claims to the README.

## Frontend checks

From `Frontend-new/IDS`:

```bash
npm run lint
npm run build
```

Check:

- Login and registration form validation.
- Token persistence and logout behavior.
- Protected-route behavior.
- Document list loading and empty states.
- Upload progress, success, and failure states.
- AI question submission and loading states.
- Source/citation rendering.
- Chat history and export downloads.
- API failure handling when either backend is offline.

## Django checks

From `Backend-new`, with the virtual environment active:

```bash
python manage.py check
python manage.py test
```

Recommended automated tests:

- Registration validation.
- JWT login and refresh.
- Anonymous access is denied for protected routes.
- A user only sees their own documents.
- A user cannot retrieve or delete another user's document.
- Chat history is scoped to the current user.
- CSV and PDF exports contain only the current user's records.
- Indexing failure marks the document failed and records an error.
- Reindex endpoint returns an appropriate error when FastAPI is unavailable.

## FastAPI tests

Recommended tests using `pytest` and FastAPI's test client:

- Health endpoint.
- PDF text extraction for a normal text-based PDF.
- Empty/corrupt PDF behavior.
- Plain-text upload behavior.
- Chunk size and overlap boundaries.
- Embedding output dimension matches the database schema.
- Import writes the expected number of chunks.
- Query returns only chunks from requested, authorized documents.
- Empty retrieval behavior.
- Groq timeout/provider error behavior.
- Delete removes only the requested document's chunks.

Mock the Groq client, embedding model, and database in unit tests. Keep separate integration tests for a disposable PostgreSQL database with pgvector.

## RAG evaluation

Create a small gold dataset with:

- A test document.
- A question.
- Expected answer facts.
- Expected supporting page/chunk.
- Whether the answer should be abstained from.

Track Precision@K, Recall@K, MRR, faithfulness, answer relevance, and citation correctness. Publish actual measurements with the test set and evaluation method.

## Manual end-to-end test

1. Start PostgreSQL.
2. Start Django.
3. Start FastAPI.
4. Start Vite.
5. Register a new test account.
6. Upload a synthetic text-based PDF.
7. Ask a question answerable from the PDF.
8. Inspect the answer and source.
9. Verify history persistence.
10. Export CSV and PDF.
11. Delete the document and verify associated chunks are removed.

Record date, commit hash, environment, test command, and pass/fail outcome.

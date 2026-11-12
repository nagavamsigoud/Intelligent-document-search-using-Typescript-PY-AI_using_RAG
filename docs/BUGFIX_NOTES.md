# Bug Fix Notes

This update is limited to corrections of existing behavior. It does not add user-facing product features.

## Changes made

1. **Duplicate document indexing:** Django was indexing a document during `POST /api/documents/`, and the React dashboard was then sending the same file to FastAPI again. The Django upload workflow remains the single indexing path; the redundant second FastAPI request was removed from the dashboard. This also preserves the document's `indexed`/`failed` status and chunk count.
2. **Incorrect chunk count field:** Django expected `chunk_count`, while FastAPI returned `chunks`. Django now reads the actual response field (and keeps compatibility with `chunk_count`).
3. **Document deletion route collision:** Two Django URL patterns matched the same document detail path. The duplicate route and its broken view (which queried a nonexistent `user` field instead of `owner`) were removed. The existing detail view handles deletion.
4. **Missing FastAPI cleanup endpoint:** Django already called `DELETE /documents/{document_id}`, but FastAPI did not implement it. The matching endpoint now removes the document's vector chunks.
5. **Unsafe deletion ordering:** Django now keeps the document record if FastAPI cannot confirm chunk deletion, and returns HTTP 502 rather than silently deleting only the relational record.
6. **Chat/document ownership validation:** A chat message can no longer be associated with a document owned by a different user through the Django serializer.
7. **SQL vector parameterization:** The question embedding is passed as a SQL parameter and cast to `vector`, rather than interpolated into the SQL string.
8. **Request validation:** Ask requests now use a per-instance default list, reject empty/oversized questions, cap the document ID list, and constrain the requested source count.
9. **PDF parsing correctness:** The parser no longer invents searchable text from raw PDF bytes or indexes a fabricated explanatory paragraph as document content. Empty, corrupt, or image-only PDFs return HTTP 422 with a clear message. OCR remains unimplemented.

## Not changed

- No new UI features or RAG capabilities were added.
- No embedding model, chunk size, LLM provider, database schema, or frontend design was changed.
- Existing Markdown documentation remains included.
- Existing non-code assets and dependencies remain unchanged.

## Validation performed

- Source-level consistency checks and Python syntax compilation were run on the modified Python files.
- Full integration tests require the project's PostgreSQL/pgvector database, Python dependencies, Groq credentials, and frontend environment. Those live-service tests were not run as part of ZIP creation.

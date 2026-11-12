# Security Review and Hardening Checklist

This is a review checklist, not a claim that all items are already implemented.

## Controls visible in the current source

- Django REST Framework is configured to use SimpleJWT authentication by default.
- Document list/detail querysets are filtered by the authenticated Django user in the corresponding class-based views.
- Chat history querysets and export queries are filtered by the authenticated user.
- Django CORS configuration currently allows local Vite origins.
- Environment variables are used for Django secret key, database URL, Groq key, and AI service URL.

## Items to verify or improve before deployment

### 1. Secrets and configuration

- Replace the development fallback Django secret key with a required secret in production.
- Set `DJANGO_DEBUG=False` in production.
- Configure `DJANGO_ALLOWED_HOSTS` to exact production hosts.
- Never commit `.env`, API keys, passwords, tokens, database dumps, or personal uploaded files.
- Rotate any credential that was ever committed, even if it was later removed.

### 2. FastAPI authentication and document authorization

- Verify whether FastAPI endpoints require authentication.
- Verify that a user can only import, query, or delete document IDs they own.
- Do not trust a document ID supplied by the browser without checking ownership.
- Consider service-to-service authentication between Django and FastAPI.
- Add tests proving that one user cannot access another user's chunks.

### 3. Database access

- Parameterize SQL values; do not concatenate user-controlled values into SQL.
- Restrict database permissions to the minimum required.
- Use TLS for remote database connections.
- Validate document IDs and source limits.
- Add indexes appropriate to the vector query and metadata filters.

### 4. File uploads

- Enforce file size limits.
- Validate file types using content inspection as well as filename extensions.
- Generate safe storage names and prevent path traversal.
- Consider malware scanning and retention/deletion policies.
- Treat parsed document text as untrusted input; retrieved text can contain prompt-injection instructions.

### 5. LLM and RAG safety

- Keep system instructions separate from retrieved document text.
- Tell the model that retrieved passages are untrusted reference data, not instructions.
- Require the model to state when the documents do not contain an answer.
- Avoid exposing secrets or unrelated user data in prompts.
- Log request IDs and operational metrics, but avoid logging sensitive document contents.

### 6. Browser and deployment

- Restrict CORS to trusted frontend origins.
- Use HTTPS.
- Configure secure cookies/headers as appropriate to the chosen auth design.
- Add rate limits for login, uploads, and LLM requests.
- Set timeouts and request-size limits.
- Monitor API errors, model-provider failures, and database health.

## Pre-release security tests

- Anonymous user cannot access protected Django APIs.
- User A cannot list, retrieve, delete, or reindex User B's document.
- User A cannot ask FastAPI about User B's document ID.
- User A cannot delete User B's vector chunks.
- Malformed and oversized uploads are rejected safely.
- SQL-special characters in questions and filenames do not alter database queries.
- API keys do not appear in frontend bundles, logs, or Git history.

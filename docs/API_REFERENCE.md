# API Reference

The routes below are derived from the Django URL configuration and FastAPI route declarations. Confirm exact request fields and response schemas in the running services' OpenAPI documentation before integrating another client.

## Django API

Base URL (local): `http://127.0.0.1:8000`

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| POST | `/api/register/` | Public | Register a user |
| POST | `/api/token/` | Public | Obtain JWT pair |
| POST | `/api/token/refresh/` | Refresh token | Refresh access token |
| GET | `/api/documents/` | JWT | List current user's documents |
| POST | `/api/documents/` | JWT | Upload/create document |
| GET | `/api/documents/{id}/` | JWT | Retrieve one owned document |
| DELETE | `/api/documents/{id}/` | JWT | Delete document |
| POST | `/api/documents/{id}/reindex/` | JWT | Reindex document |
| GET | `/api/documents/history/` | JWT | List chat history |
| POST | `/api/documents/history/` | JWT | Save chat history |
| GET | `/api/documents/history/export/csv/` | JWT | Export CSV |
| GET | `/api/documents/history/export/pdf/` | JWT | Export PDF |

The Django project URL configuration mounts the accounts and documents routes. Use the actual `config/urls.py` when checking a route prefix.

## FastAPI AI service

Base URL (local): `http://127.0.0.1:8001`

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/documents/import` | Import and index a document |
| POST | `/ask` | Retrieve context and generate an answer |
| DELETE | `/documents/{document_id}` | Delete indexed chunks |

Open `http://127.0.0.1:8001/docs` while FastAPI is running for the generated OpenAPI schema, interactive request forms, and exact Pydantic request/response models.

## Typical request sequence

1. Register or sign in through Django.
2. Include `Authorization: Bearer <access-token>` on protected Django API requests.
3. Upload the document through the frontend/Django workflow.
4. The frontend sends the document to FastAPI import endpoint with the document ID.
5. Submit a question to FastAPI `/ask`.
6. Save the returned answer and source metadata to Django chat history.

## Integration cautions

- The FastAPI service is a separate API. Do not assume Django JWT authentication automatically protects FastAPI routes; inspect its own authentication and authorization implementation.
- The current ingestion workflow is initiated by the browser after Django creates the record.
- Check request field names in the Pydantic models and frontend API client before writing scripts or external clients.

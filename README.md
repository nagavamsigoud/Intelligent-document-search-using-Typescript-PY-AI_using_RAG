# Intelligent Document Search Using Retrieval-Augmented Generation (RAG)

A full-stack document question-answering application. Users upload documents, the backend indexes their text, and the AI service retrieves relevant chunks to answer questions with source information.

> **Project status:** This repository contains a working project implementation, but this documentation does not claim production readiness. See [Known limitations](#known-limitations) and the `docs/` folder before deploying or presenting it.

## Contents

- [What the application does](#what-the-application-does)
- [Architecture](#architecture)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Run locally](#run-locally)
- [Environment configuration](#environment-configuration)
- [API overview](#api-overview)
- [Known limitations](#known-limitations)
- [Documentation](#documentation)

## What the application does

1. A user registers and signs in through the React interface.
2. Django REST Framework manages authentication, document metadata, and chat history.
3. The browser sends the selected document to the FastAPI AI service for indexing.
4. FastAPI extracts text, splits it into chunks, creates local embeddings, and stores chunks in PostgreSQL with pgvector.
5. A question is embedded and used to retrieve relevant chunks.
6. The Groq chat model generates an answer using the retrieved context.
7. The frontend displays the answer and returned source information.
8. Django stores chat history and provides CSV/PDF export endpoints.

## Architecture

```mermaid
flowchart TD
    U[User] --> FE[React + TypeScript frontend]
    FE -->|JWT and document metadata| DJ[Django REST Framework]
    FE -->|Document import and questions| AI[FastAPI AI service]
    DJ --> DB[(PostgreSQL)]
    AI --> DB
    AI --> EMB[Sentence Transformers]
    EMB --> V[(pgvector embeddings)]
    AI --> LLM[Groq chat completion]
    LLM --> AI
    AI --> FE
    DJ --> FE
```

Django and FastAPI are separate processes. They both connect to the configured PostgreSQL database. The frontend is a third development process.

## Technology stack

| Area | Technology | Role in this repository |
|---|---|---|
| Frontend | React, TypeScript, Vite | Browser application |
| Styling | Tailwind CSS v4 / Vite plugin | UI styling |
| State | Redux Toolkit, React Redux | Client-side state |
| HTTP | Axios | API requests |
| Routing | React Router DOM | Frontend navigation |
| Application API | Django, Django REST Framework | Authentication, document records, history, exports |
| Authentication | SimpleJWT | JWT access and refresh tokens |
| AI API | FastAPI, Uvicorn | Parsing, chunking, retrieval, answer generation |
| Embeddings | Sentence Transformers, `all-MiniLM-L6-v2` | Local text embeddings |
| Vector storage | PostgreSQL, pgvector | Stores and searches vector representations |
| LLM | Groq API | Generates answers from retrieved context |
| Export | ReportLab, Python CSV | PDF and CSV chat-history exports |

## Repository structure

```text
.
├── README.md
├── docs/
├── Frontend-new/
│   └── IDS/
│       ├── src/
│       ├── package.json
│       └── README.md
└── Backend-new/
    ├── manage.py
    ├── requirements.txt
    ├── config/
    ├── accounts/
    ├── documents/
    └── fastapi-ai/
        └── app/
            └── main.py
```

## Run locally

Use three terminals from the repository root. These commands assume Windows PowerShell and a Python virtual environment at `Backend-new/.venv`. If you use another environment location, adjust the activation command.

### 1. Configure Python dependencies

```powershell
cd Backend-new
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create `Backend-new/.env` using the variables described in [Environment configuration](#environment-configuration).

### 2. Start Django

In Terminal 1:

```powershell
cd Backend-new
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver 8000
```

Django: `http://127.0.0.1:8000/`

### 3. Start FastAPI

In Terminal 2:

```powershell
cd Backend-new\fastapi-ai
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```

FastAPI OpenAPI UI: `http://127.0.0.1:8001/docs`

### 4. Start the frontend

In Terminal 3:

```powershell
cd Frontend-new\IDS
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`.

### 5. Check the services

- Frontend: `http://localhost:5173`
- Django: `http://127.0.0.1:8000/`
- FastAPI docs: `http://127.0.0.1:8001/docs`
- FastAPI health endpoint: `http://127.0.0.1:8001/health`

The app also needs a reachable PostgreSQL database with the pgvector extension and a valid Groq API key for answer generation.

## Environment configuration

Create `Backend-new/.env` locally. Do not commit real secrets.

```env
# Django
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

# Database: use the same database for Django and FastAPI
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

# FastAPI / LLM
GROQ_API_KEY=replace-with-your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile
EMBEDDING_DIMENSIONS=384

# Django -> FastAPI
AI_API_URL=http://localhost:8001
```

The code currently has defaults for some development settings. Set explicit values in `.env`; never rely on development defaults in a deployed environment. The selected Groq model must still be available to your Groq account. Check the provider's current model list before deployment.

The frontend API base URLs are configured in the frontend source. If you change service ports or deploy the app, verify and update those settings deliberately.

## API overview

| Method | Path | Service | Purpose |
|---|---|---|---|
| POST | `/api/register/` | Django | Register an account |
| POST | `/api/token/` | Django | Obtain JWT tokens |
| POST | `/api/token/refresh/` | Django | Refresh an access token |
| GET | `/api/documents/` | Django | List the signed-in user's documents |
| POST | `/api/documents/` | Django | Create a document record/upload |
| GET | `/api/documents/{id}/` | Django | Retrieve a document |
| DELETE | `/api/documents/{id}/` | Django | Delete a document |
| POST | `/api/documents/{id}/reindex/` | Django | Request document re-indexing |
| GET/POST | `/api/documents/history/` | Django | List/create chat history |
| GET | `/api/documents/history/export/csv/` | Django | Export chat history as CSV |
| GET | `/api/documents/history/export/pdf/` | Django | Export chat history as PDF |
| GET | `/health` | FastAPI | AI service health check |
| POST | `/documents/import` | FastAPI | Parse and index a document |
| POST | `/ask` | FastAPI | Retrieve context and generate an answer |
| DELETE | `/documents/{document_id}` | FastAPI | Delete indexed chunks |

See [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) for request/response details and verification notes.

## Known limitations

These are documentation observations from the current source tree, not fixes:

- The PDF parser uses `pdfplumber`; its binary-string fallback is not OCR. Image-only scanned PDFs need a real OCR pipeline for reliable text extraction.
- Non-PDF uploads follow a UTF-8 text-decoding fallback in the current FastAPI parser. The presence of `python-docx` in requirements does not by itself mean DOCX parsing is implemented.
- The UI exposes Document only, Hybrid, and General AI modes. Verify the actual FastAPI behavior before describing these as three distinct retrieval strategies.
- The current `confidence` value should not be presented as a calibrated probability or a validated answer-quality score.
- Document import is initiated from the browser after Django creates the document record. The workflow is not a background job queue.
- Review authorization between Django and FastAPI, production CORS/host settings, database query parameterization, and error handling before public deployment.
- Tests in the repository are not a substitute for a full integration and security test suite.

## Documentation

| Document | What it covers |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | Services and request flow |
| [RAG pipeline](docs/RAG_PIPELINE.md) | Parsing, chunking, embeddings, retrieval, generation |
| [Database schema](docs/DATABASE_SCHEMA.md) | Django entities and vector records |
| [API reference](docs/API_REFERENCE.md) | Endpoints and payload expectations |
| [Local setup](docs/LOCAL_SETUP.md) | Detailed setup steps |
| [Security review](docs/SECURITY.md) | Security controls and items to verify |
| [Testing](docs/TESTING.md) | Test strategy and validation checklist |
| [Deployment](docs/DEPLOYMENT.md) | Production-readiness checklist |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common local development problems |
| [Decision log](docs/DECISION_LOG.md) | Recorded architectural choices and trade-offs |
| [Interview preparation](docs/INTERVIEW_PREPARATION.md) | How to explain the project honestly |

## Before publishing to GitHub

- Remove personal documents and private test uploads from `Backend-new/media/`.
- Confirm `.env`, API keys, database passwords, and real user data are not tracked.
- Review the full Git history if a secret or private document was ever committed; deleting it from the latest folder does not erase history.
- Run tests and frontend lint/build checks.
- Replace screenshots/demo data with non-sensitive examples.

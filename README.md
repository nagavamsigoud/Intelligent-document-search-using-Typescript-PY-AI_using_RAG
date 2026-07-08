Information about the project
## Tech Stack

| Layer | Technologies | Purpose |
|---|---|---|
| Frontend | React, TypeScript, Vite | Builds the user interface and dashboard |
| Styling | Tailwind CSS v4 with `@tailwindcss/vite` | Provides responsive utility-based UI design |
| State Management | Redux Toolkit, React Redux | Stores authentication state and app-level state |
| API Calls | Axios | Connects frontend with Django and FastAPI services |
| Routing | React Router DOM | Handles login, register, dashboard routes |
| Auth Backend | Django, Django REST Framework | Handles user registration, protected APIs, document metadata |
| JWT Auth | SimpleJWT | Provides access and refresh tokens |
| AI Backend | FastAPI | Handles parsing, chunking, local embeddings, retrieval, and answer generation |
| Answer Model | Groq with `llama-3.3-70b-versatile` | Generates final answers from retrieved document context |
| Embedding Model | `sentence-transformers` with `all-MiniLM-L6-v2` | Generates local document and question vectors without an embedding API key |
| Database | Supabase PostgreSQL | Stores users, documents, chat history, metadata, and vector chunks |
| Vector Search | pgvector with `VECTOR(384)` | Stores/searches local embeddings for semantic retrieval |
| Export | ReportLab, CSV | Exports chat history as PDF or CSV |
| Deployment | Docker, Docker Compose | Runs frontend, Django, FastAPI, PostgreSQL, and Redis together |

## Frontend Features

### 1. User Authentication UI

The frontend includes login and register pages where users can create an account and sign in. Login sends the username and password to the Django JWT endpoint. After successful login, the access and refresh tokens are saved in browser local storage.

Main files:

```text
Frontend-new/IDS/src/pages/LoginPage.tsx
Frontend-new/IDS/src/pages/RegisterPage.tsx
Frontend-new/IDS/src/store/authSlice.ts
```

### 2. Redux Authentication State

Redux Toolkit manages the authentication state of the user. It stores the current access token, refresh token, loading state, and error messages. The logout action clears tokens from local storage and resets the user session.

Main files:

```text
Frontend-new/IDS/src/store/store.ts
Frontend-new/IDS/src/store/authSlice.ts
Frontend-new/IDS/src/hooks/redux.ts
```

### 3. Axios API Layer

Axios is configured for two backend services: Django authentication/document APIs and FastAPI AI APIs. The Django API automatically attaches the JWT token to protected requests, while the AI API sends questions to the FastAPI RAG service.

Main files:

```text
Frontend-new/IDS/src/api/client.ts
Frontend-new/IDS/src/api/api.ts
```

### 4. Dashboard

The dashboard is the main user workspace. It shows uploaded documents, indexing status, document summaries, answer mode controls, AI question input, generated answer area, citation cards, chat history, and export actions.

Main file:

```text
Frontend-new/IDS/src/pages/DashboardPage.tsx
```

### 5. Document Upload UI

Users can upload documents through the frontend and send them to Django. The interface mentions common formats such as PDF, DOCX, CSV, and TXT, while the current FastAPI parser has dedicated PDF handling and treats non-PDF files as text-style uploads.

Supported workflow:

```text
User selects file
Frontend sends FormData to Django (saves metadata)
Django returns unique document record ID
Frontend directly hits FastAPI /documents/import with file and ID
FastAPI indexes document chunks into Supabase pgvector
Frontend reloads document list
```

### 6. AI Answer Modes

The frontend includes three answer modes:

```text
Document only
Hybrid
General AI
```

Document-only mode answers from indexed documents. Hybrid and general modes are present in the UI, but the current FastAPI logic still depends on retrieved document sources and Groq for answer generation.

Main file:

```text
Frontend-new/IDS/src/components/ModeToggle.tsx
```

### 7. Citations And Sources

After a question is submitted, FastAPI returns the generated answer, confidence value, and source chunks. The frontend displays citation cards with similarity score, document title, page number, and matched text.

This makes the answer more trustworthy because the user can see where the information came from.

### 8. Chat History

After a successful answer, the frontend saves the question, answer, mode, confidence, and sources into Django chat history. The dashboard then displays recent history records.

### 9. Export Options

Users can export chat history as CSV or PDF. The frontend calls Django export endpoints and downloads the generated file.

Export formats:

```text
CSV
PDF
```

### 10. TypeScript Types

The frontend includes shared TypeScript types for documents, sources, chat history, and AI responses. This improves code safety and makes API response usage clearer.

Main file:

```text
Frontend-new/IDS/src/types/index.ts
```

## Backend Features

The backend is split into two services:

```text
Django Auth/API Backend
FastAPI AI/RAG Backend
```

This separation keeps normal application logic and AI processing independent.

## Django Backend Features

### 1. Main Django Project

In Django, `config` is the main project app. It contains global settings, root URLs, ASGI, and WSGI configuration.

Main files:

```text
backend-new/config/settings.py
backend-new/config/urls.py
backend-new/config/asgi.py
backend-new/config/wsgi.py
```

### 2. Accounts App

The `accounts` app is a normal Django app. It handles user registration. Login is handled through SimpleJWT token endpoints.

Main files:

```text
backend-new/accounts/serializers.py
backend-new/accounts/views.py
backend-new/accounts/urls.py
```

Important APIs:

```text
POST /api/register/
POST /api/token/
POST /api/token/refresh/
```

### 3. Documents App

The `documents` app is a normal Django app. It stores document metadata, uploaded file information, indexing status, chat history, confidence values, and citations.

Main files:

```text
backend-new/documents/models.py
backend-new/documents/serializers.py
backend-new/documents/views.py
backend-new/documents/urls.py
```

### 4. Document Model

The `Document` model stores uploaded file details.

Stored fields include:

```text
owner
title
file
file_type
status
chunk_count
file_size
summary
error_message
last_indexed_at
created_at
```

### 5. Chat History Model

The `ChatMessage` model stores user questions and AI responses.

Stored fields include:

```text
owner
document
question
answer
mode
confidence
sources_json
created_at
```

### 6. Document Upload And Indexing

When a document is uploaded, Django saves the file metadata and forwards the file to FastAPI. FastAPI parses and indexes the document, then returns indexing status, chunk count, summary, and file type. Django saves those values in the database.

Backend flow:

```text
Frontend uploads file metadata to Django
Django receives file data & saves SQL Document record
Django returns unique record ID to Frontend
Frontend triggers FastAPI /documents/import with file and ID
FastAPI parses, chunks, and indexes file into vector store
Frontend refreshes dashboard state
```

### 7. Chat History Export

Django provides export endpoints for CSV and PDF. The CSV export is useful for analysis and reporting, while PDF export is useful for project demonstration and documentation.

Export APIs:

```text
GET /api/documents/history/export/csv/
GET /api/documents/history/export/pdf/
```

## FastAPI Backend Features

### 1. AI Service

FastAPI is used as a separate AI service because document parsing, local embedding generation, vector search, and Groq answer calls are better handled in an independent lightweight API.

Main file:

```text
backend-new/fastapi-ai/app/main.py
```

### 2. Health Check

The health endpoint confirms that the AI service is running.

```text
GET /health
```

### 3. Document Import Endpoint

The document import endpoint receives uploaded files from Django. It extracts text, chunks content, creates local sentence-transformer embeddings, and stores indexed chunks in Supabase PostgreSQL with pgvector.

```text
POST /documents/import
```

Supported parsing behavior in the current FastAPI code:

```text
PDF files: parsed with pypdf
Other files: decoded as plain text
```

### 4. Text Parsing

FastAPI parses files based on extension. PDF files are processed using `pdfplumber`, and all other uploaded files are currently decoded as plain text. The requirements file still includes `python-docx`, so DOCX support can be added later, but the current `main.py` handles PDF and text-style content.

### 5. Chunking

Extracted text is split into smaller chunks. Chunking makes retrieval more accurate because the system searches smaller sections instead of entire documents.

Default behavior in the current code:

```text
chunk_size = 700 characters
overlap = 100 characters
```

### 6. Local Embeddings

The current FastAPI service uses a local embedding model from `sentence-transformers`. It loads `all-MiniLM-L6-v2`, creates vectors locally, and truncates them to 384 dimensions to match the PostgreSQL `VECTOR(384)` column. This means embeddings do not require an external embedding API key.

Related setting:

```text
EMBEDDING_DIMENSIONS
```

### 7. pgvector Storage

FastAPI stores document chunks in a `rag_chunks` table. Each chunk includes text, page number, document ID, source title, and a pgvector embedding.

Table fields:

```text
id
document_id
source_title
chunk_index
page_number
chunk_text
embedding
created_at
```

### 8. Question Answering

The `/ask` endpoint receives a question, selected document IDs, answer mode, and max source count. It creates a local question embedding, retrieves relevant chunks using pgvector similarity, builds context, and uses Groq to return an answer with citations.

```text
POST /ask
```

Response includes:

```text
answer
confidence
sources
```

### 9. Citation Support

Each source contains:

```text
document_id
score
title
text
```

These values are shown in the frontend as citation cards.

### 10. Delete Document Chunks

When a document is deleted from Django, FastAPI can delete related chunks from the vector table.

```text
DELETE /documents/{document_id}
```

## Supabase Usage

The project can use Supabase PostgreSQL as the database. Supabase is useful because it provides hosted PostgreSQL, database dashboard, SQL editor, and optional storage.

### 1. Create Supabase Project

Create a new Supabase project and copy the PostgreSQL connection string from Supabase settings.

Use the connection pooler URL if available.

### 2. Enable pgvector

Open Supabase SQL Editor and run:

```sql
create extension if not exists vector;
```

### 3. Environment Variables

The current backend reads environment variables from:

```text
backend-new/.env
```

Use this format. Keep the real Groq key and Supabase password private, especially before pushing to GitHub:

```env
# --- DATABASE CONFIGURATION ---
DATABASE_URL=postgresql://postgres:your-password@db.your-project-ref.supabase.co:5432/postgres

# --- AI SERVICE CONFIGURATION ---
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=llama-3.3-70b-versatile

# --- EMBEDDING CONFIGURATION ---
# Local sentence-transformer model is used, so no embedding API key is needed.
EMBEDDING_DIMENSIONS=384
```

Frontend API variables can be placed in the frontend Vite environment file if needed:

```env
VITE_AUTH_API_URL=http://localhost:8000/api
VITE_AI_API_URL=http://localhost:8001
```

### 4. Django Supabase Connection

Django reads `DATABASE_URL` inside `backend-new/config/settings.py`. If `DATABASE_URL` exists, Django uses Supabase. If it does not exist, Django uses local PostgreSQL variables.

### 5. FastAPI Supabase Connection

FastAPI loads `backend-new/.env` directly in `backend-new/fastapi-ai/app/main.py`. Use the same `DATABASE_URL` value so Django and FastAPI talk to the same Supabase database.

## Local Setup

### Frontend

```powershell
cd D:\codex\Project\intelligent-document-rag\Frontend-new\IDS
npm install
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

### Django Backend

```powershell
cd D:\intelligent-document-rag\backend-new
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
python manage.py runserver 8000
```

Django API:

```text
http://localhost:8000/api
```

### FastAPI Backend

```powershell
cd D:intelligent-document-rag\backend-new\fastapi-ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

FastAPI Docs:

```text
http://localhost:8001/docs
```

## Main API Endpoints

| Method | Endpoint | Service | Purpose |
|---|---|---|---|
| POST | `/api/register/` | Django | Create user account |
| POST | `/api/token/` | Django | Login and receive JWT tokens |
| POST | `/api/token/refresh/` | Django | Refresh access token |
| GET | `/api/documents/` | Django | List uploaded documents |
| POST | `/api/documents/` | Django | Upload document |
| DELETE | `/api/documents/{id}/` | Django | Delete document |
| POST | `/api/documents/{id}/reindex/` | Django | Reindex document |
| GET | `/api/documents/history/` | Django | List chat history |
| POST | `/api/documents/history/` | Django | Save chat record |
| GET | `/api/documents/history/export/csv/` | Django | Export CSV |
| GET | `/api/documents/history/export/pdf/` | Django | Export PDF |
| GET | `/health` | FastAPI | AI service health check |
| POST | `/documents/import` | FastAPI | Parse and index document |
| POST | `/ask` | FastAPI | Ask AI question |
| DELETE | `/documents/{document_id}` | FastAPI | Delete indexed chunks |

## GitHub Usage

Use this documentation as your GitHub project overview. For a clean GitHub repository, include:

```text
README.md
GITHUB_DOCUMENTATION.md
.env.example
Frontend-new/IDS
backend-new
infra
```

Do not upload:

```text
node_modules
.venv
__pycache__
.env
media files with private documents
database dumps with real user data
```

Recommended `.gitignore` entries:

```gitignore
.env
node_modules/
dist/
.venv/
__pycache__/
*.pyc
media/
uploads/
*.sqlite3
```

## Suggested GitHub README Sections

For GitHub, keep the main `README.md` short and link to this file for details.

Recommended README sections:

```text
Project title
Short description
Screenshots
Tech stack
Features
Architecture
Setup instructions
Environment variables
API endpoints
Future enhancements
```

## Future Enhancements

The project can be improved further with OCR for scanned PDFs, Supabase Storage for uploaded files, role-based access control, answer feedback, evaluation metrics, multilingual search, and deployment to Render, Railway, Vercel, or Docker-based cloud hosting.

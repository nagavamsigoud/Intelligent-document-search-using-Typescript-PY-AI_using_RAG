# Local Development Setup

These instructions target Windows PowerShell. Run the frontend, Django, and FastAPI in three separate terminals.

## Prerequisites

- Python version compatible with the packages in `Backend-new/requirements.txt`
- Node.js and npm compatible with the Vite version in `Frontend-new/IDS/package.json`
- PostgreSQL
- pgvector extension enabled in the selected database
- Groq API key for LLM answer generation

## 1. Configure PostgreSQL

Create or select a PostgreSQL database. Enable pgvector:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Use the same database URL for Django and FastAPI. Ensure the database user can create/read/write the tables required by the application.

## 2. Create Python environment

From repository root:

```powershell
cd Backend-new
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

If PowerShell blocks script activation, use an approved local execution-policy setting or activate the environment using Command Prompt's `.\.venv\Scripts\activate.bat`.

## 3. Create environment file

Create `Backend-new/.env`:

```env
DJANGO_SECRET_KEY=use-a-long-random-secret
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=your-currently-supported-groq-model
EMBEDDING_DIMENSIONS=384
AI_API_URL=http://localhost:8001
```

Use URL-encoded special characters in database credentials if required by the connection URL parser. Keep this file private and out of version control.

## 4. Run migrations and Django

Terminal 1:

```powershell
cd Backend-new
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py migrate
python manage.py runserver 8000
```

Optional: create an admin account:

```powershell
python manage.py createsuperuser
```

## 5. Run FastAPI

Terminal 2:

```powershell
cd Backend-new\fastapi-ai
..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8001
```

Visit:

- `http://127.0.0.1:8001/health`
- `http://127.0.0.1:8001/docs`

The embedding model may need to be downloaded the first time it is loaded, so the first startup can take longer and may require network access.

## 6. Run frontend

Terminal 3:

```powershell
cd Frontend-new\IDS
npm install
npm run dev
```

Open `http://localhost:5173`.

## 7. Verify end-to-end

- Register a test user.
- Log in and confirm the frontend receives tokens.
- Upload a small text-based PDF with non-sensitive content.
- Confirm the Django document record appears.
- Confirm FastAPI import returns an indexed result and chunk count.
- Ask a question whose answer appears clearly in the PDF.
- Confirm returned sources identify the expected document/page.
- Confirm chat history and CSV/PDF exports work.

Use synthetic test content. Do not use personal records or confidential documents for a public demo.

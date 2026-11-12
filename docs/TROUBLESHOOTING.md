# Troubleshooting

## Django: database connection refused

- Confirm PostgreSQL is running.
- Verify `DATABASE_URL` or the `POSTGRES_*` variables.
- Check host, port, database name, username, and password.
- Confirm the database accepts connections from your machine.

## Django: `No module named ...`

Activate the Python environment and install requirements:

```powershell
cd Backend-new
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## FastAPI: Uvicorn cannot import `app.main`

Run Uvicorn from `Backend-new/fastapi-ai`:

```powershell
uvicorn app.main:app --reload --port 8001
```

The working directory matters because `app` is a package relative to this folder.

## FastAPI: Groq authentication or model error

- Check that `GROQ_API_KEY` is present in the environment loaded by the AI service.
- Confirm the key is valid and has access to the configured model.
- Model identifiers can be deprecated; use a currently supported model name.
- Do not paste API keys into logs, screenshots, or public issue reports.

## pgvector or vector column errors

- Enable the extension: `CREATE EXTENSION IF NOT EXISTS vector;`
- Confirm the vector column dimension matches the embedding model output.
- Confirm both services use the same database.
- Check the vector table and index schema against the SQL used by FastAPI.

## Document import fails

- Confirm FastAPI is running and `AI_API_URL` points to it.
- Test a small text-based PDF first.
- Check FastAPI logs for extraction, embedding, and database errors.
- A scanned PDF is not reliably handled by the current byte/string fallback; OCR is not implemented by that fallback.

## Frontend cannot reach the backend

- Confirm Django and FastAPI ports.
- Check Axios base URLs in `Frontend-new/IDS/src/api/`.
- Confirm Django CORS includes the frontend origin.
- Inspect browser developer tools for the failed URL and response status.
- Ensure all three processes are running in separate terminals.

## Port already in use

Use another port and update the corresponding frontend/API configuration consistently. For example:

```powershell
python manage.py runserver 8010
uvicorn app.main:app --reload --port 8011
```

Changing server ports alone is not enough; the frontend and Django-to-FastAPI URL must point to the new ports.

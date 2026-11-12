# Deployment Readiness

The repository's local development instructions are not a production deployment recipe. Complete the checklist below before deploying.

## Services to deploy

- React/Vite frontend as a static web application.
- Django REST API as an application server.
- FastAPI AI service as a separate application server.
- PostgreSQL with pgvector enabled.
- Groq API access for answer generation.

## Required configuration

- `DJANGO_SECRET_KEY`: strong, unique secret.
- `DJANGO_DEBUG=False`.
- `DJANGO_ALLOWED_HOSTS`: exact backend hostnames.
- `DATABASE_URL`: secure PostgreSQL connection string.
- `GROQ_API_KEY`: provider key stored only on the server.
- `GROQ_MODEL`: currently supported model identifier.
- `AI_API_URL`: internal or secured FastAPI service URL.
- Frontend API base URLs: production Django and FastAPI endpoints.

Do not expose `GROQ_API_KEY` through Vite environment variables or browser JavaScript.

## Infrastructure checklist

- Enable TLS for public endpoints and database connections.
- Restrict CORS to the deployed frontend origin.
- Add authentication/authorization to FastAPI and validate document ownership.
- Configure upload size and request timeouts.
- Add health checks for Django, FastAPI, and PostgreSQL.
- Add structured logs and request correlation IDs.
- Configure database backups and restore tests.
- Decide where uploaded documents are stored and how they are retained.
- Add rate limiting and cost controls for LLM calls.
- Configure monitoring and alerting.
- Pin and review dependency versions.
- Run frontend build, backend tests, and security tests in CI.

## Scaling considerations

- Model loading may consume memory; avoid loading a separate embedding model for every request.
- Synchronous document indexing can hold requests open. Consider a durable worker queue for larger files or higher traffic.
- Add vector indexes and metadata indexes after measuring query performance.
- Track LLM latency, token usage, provider errors, retrieval latency, and upload/indexing failures.

## Docker note

The root README's previous stack summary mentioned Docker Compose, but the supplied project archive should be checked for actual Dockerfiles and a Compose file before claiming a containerized deployment is ready. Do not advertise Docker support unless the deployment files exist and have been tested.

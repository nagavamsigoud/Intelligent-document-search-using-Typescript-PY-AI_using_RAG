# Intelligent Document Search — Frontend

This directory contains the React + TypeScript + Vite frontend for the Intelligent Document Search application.

## Responsibilities

- User registration and login screens
- JWT token handling in the frontend state
- Document dashboard and upload interface
- Calling the Django application API and FastAPI AI API
- Displaying answers and returned source information
- Showing chat history and export actions

## Technology

- React
- TypeScript
- Vite
- Redux Toolkit and React Redux
- Axios
- React Router DOM
- Tailwind CSS v4 with the Vite integration

## Run locally

From this directory:

```bash
npm install
npm run dev
```

Vite normally starts at `http://localhost:5173`.

## Useful scripts

```bash
npm run dev      # Start the Vite development server
npm run build    # Run TypeScript project build and create the production bundle
npm run lint     # Run ESLint
npm run preview  # Preview the production build locally
```

## Important source locations

```text
src/
├── api/          # Axios clients and API functions
├── components/   # Shared UI components
├── hooks/        # Typed Redux hooks
├── pages/        # Login, registration, dashboard pages
├── store/        # Redux store and slices
└── types/        # Shared TypeScript types
```

## Backend services

The frontend depends on two backend services during normal application use:

- Django REST Framework for registration, JWT authentication, document metadata, chat history, and exports.
- FastAPI for document import/indexing and AI question answering.

Start both backend services before testing the complete workflow. See the repository-root README and [`docs/LOCAL_SETUP.md`](../../../docs/LOCAL_SETUP.md).

## Configuration

Check `src/api/` for the configured API base URLs before changing backend ports or deploying. Do not place private server-side secrets such as the Groq API key in frontend environment variables: Vite-exposed variables are bundled for browser access.

## Current limitations

The frontend UI exposes several answer modes and upload-format choices. The actual behavior is determined by the backend implementation; do not assume a UI option means the corresponding backend capability is fully implemented. See [`docs/RAG_PIPELINE.md`](../../../docs/RAG_PIPELINE.md).

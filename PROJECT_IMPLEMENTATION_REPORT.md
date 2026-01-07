
# Nexus Workspace AI: Production Architecture Spec (Arch 2)

## Executive Summary
This document defines "Architecture 2", a production-grade infrastructure designed for secure public access via **Cloudflare Tunnels**. It transitions the system from a client-side prototype to a **Backend-for-Frontend (BFF)** pattern using a Python (FastAPI) backend that embeds **Mem0** and coordinates with **txtai**, **Gemini**, and **Cloudflare R2**.

---

## Deliverable A: Backend Service Design

### 1. Technology Stack
*   **Runtime**: Python 3.11+ (FastAPI)
*   **AI Memory**: Mem0 (Embedded library, storing to Postgres `memories` table)
*   **Vector Search**: txtai (External microservice via HTTP)
*   **Storage**: Cloudflare R2 (S3-compatible object storage)
*   **Database**: PostgreSQL 16 + pgvector

### 2. Authentication Flow (Google OAuth2)
We implement the "Authorization Code" flow to keep tokens secure on the server.
1.  **Frontend**: User clicks "Login". Redirects to `https://api.pcnaid.com/auth/google/start`.
2.  **Backend**: Generates state, redirects user to Google Accounts.
3.  **Google**: User consents, redirects to `https://api.pcnaid.com/auth/google/callback?code=...`.
4.  **Backend**:
    *   Exchanges `code` for `access_token` and `refresh_token`.
    *   Encrypts tokens using `ENCRYPTION_KEY` (AES-GCM).
    *   Upserts user in `users` table.
    *   Creates a session in Redis/Postgres.
    *   Sets a `HttpOnly; Secure; SameSite=Lax` cookie (`nexus_session`).
    *   Redirects user to `https://nexus.pcnaid.com`.

### 3. Routes & API Structure
*   `GET /auth/me`: Returns user profile if session valid.
*   `POST /chat/message`: Main entry point.
    *   **Input**: Message content, attachment references, active persona ID.
    *   **Process**:
        1.  Auth Check (Session Middleware).
        2.  **Mem0**: `m.add(message, user_id=uid)` (Async).
        3.  **Mem0**: `m.search(message, user_id=uid)` -> Get relevant facts.
        4.  **txtai**: HTTP POST `TXTAI_BASE_URL/search` -> Get doc chunks.
        5.  **Gemini**: Construct prompt with Context + Memory + System Instruction.
        6.  **Stream Response**: return Server-Sent Events (SSE) or JSON.
*   `POST /storage/presign`:
    *   **Input**: `{ filename, contentType, useCase: 'avatar'|'doc'|'media' }`
    *   **Output**: `{ uploadUrl, publicUrl, r2Key }` (Pre-signed PUT URL for R2).

### 4. Security Strategy
*   **CORS**: Allow Origins strictly set to `['https://nexus.pcnaid.com', 'http://localhost:3000']`.
*   **Encryption at Rest**: All OAuth tokens and sensitive keys in DB are encrypted.
*   **Zero Trust**: No ports opened on host. Cloudflare Tunnel handles ingress.

---

## Deliverable B: Infrastructure (Docker Compose)
(See `docker-compose.yml` for implementation).
*   **Frontend**: Port 3000
*   **Backend**: Port 3001
*   **txtai**: Port 8000
*   **Neo4j**: Port 7474 (and 7687 bolt)
*   **Postgres**: Port 5432

---

## Deliverable C: High-Level Database Tables

1.  **Identity**:
    *   `users`: id, email, name, avatar, created_at
    *   `sessions`: id, user_id, expires_at, data (json)
    *   `integrations`: user_id, provider ('google'), encrypted_access_token, encrypted_refresh_token

2.  **Core Application**:
    *   `workspaces`: id, name, slug
    *   `projects`: id, workspace_id, name, description
    *   `tasks`: id, project_id, title, status, priority, due_date
    *   `agreements`: id, title, content, status, signatories (jsonb)

3.  **AI & RAG**:
    *   `memories` (Mem0): id, user_id, memory_text, embedding (vector), metadata
    *   `documents`: id, project_id, r2_key, filename, mime_type, status
    *   `document_chunks`: id, document_id, content, embedding (vector)
    *   `messages`: id, project_id, user_id, role, content, attachments (jsonb)

---

## Deliverable D: Cloudflare Tunnel Configuration

Execute this mapping in your Cloudflare Zero Trust Dashboard or `config.yml`:

| Public Hostname | Service | Local URL |
| :--- | :--- | :--- |
| `nexus.pcnaid.com` | Frontend | `http://localhost:3000` |
| `api.pcnaid.com` | Backend | `http://localhost:3001` |
| `txtai.pcnaid.com` | txtai | `http://localhost:8000` |
| `neo4j.pcnaid.com` | Neo4j | `http://localhost:7474` |
| `mem0.pcnaid.com` | Mem0 (Debug) | `http://localhost:8888` (Optional) |

---

## Deliverable E: Migration Plan

1.  **Environment Setup**:
    *   Provision Cloudflare R2 Buckets (`nexus-docs`, `nexus-media`).
    *   Create Google Cloud Project, configure OAuth Consent Screen, get Credentials.
    *   Set `.env` variables on the Backend server.
2.  **Backend Deployment**:
    *   Deploy `docker-compose.yml`.
    *   Run DB migrations (Create tables).
3.  **Frontend Update**:
    *   Switch `USE_MOCK_BACKEND = false` in `geminiService.ts`.
    *   Deploy Frontend to generate static assets or run SSR.
    *   Point `cloudflared` to the local ports.
4.  **Data Migration**:
    *   (Optional) If preserving prototype data, write a script to POST existing localStorage JSON to Backend API endpoints.


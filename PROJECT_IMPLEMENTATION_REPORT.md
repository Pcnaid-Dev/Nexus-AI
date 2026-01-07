
# Project Implementation Report & Architecture Spec

## Executive Summary
The Nexus Workspace AI is transitioning from a client-side prototype to a robust **Backend-for-Frontend (BFF)** production architecture. 

**Core Infrastructure Changes:**
1.  **Memory Layer**: **Mem0 (OpenMemory)** integration for persistent user profiling, fact extraction, and cross-session memory retrieval.
2.  **RAG Layer**: **txtai** implementation for semantic document search, indexing into **Postgres + pgVector**.
3.  **Storage**: **Google Cloud SQL (Postgres)** for relational data (Projects, Tasks) and vector storage.
4.  **Orchestration**: A Node.js/Python backend now handles prompt assembly, removing full-text document injection from the frontend.

---

## 1. Production Code Architecture

### Data Flow
```mermaid
graph TD
    Client[React Frontend] -->|REST / API| Orchestrator[Backend API]
    
    subgraph "Storage & Indexing"
        Orchestrator -->|Relational Data| PG[Postgres (Cloud SQL)]
        Orchestrator -->|Vector Search| Txtai[txtai Service]
        Txtai -->|Embeddings| PGVector[pgVector Extension]
    end
    
    subgraph "Cognitive Services"
        Orchestrator -->|LLM Generation| Gemini[Google Gemini API]
        Orchestrator -->|Long-term Memory| Mem0[Mem0 / OpenMemory]
    end
    
    subgraph "External"
        Orchestrator -->|OAuth/Events| Google[Google Workspace API]
    end
```

### Frontend Responsibilities (Updated)
- **Zero-Knowledge RAG**: The frontend sends *Document IDs*, not document content.
- **Session Management**: Uses HTTP-only cookies managed by the Backend via `/auth` endpoints.
- **Data Adapter**: `geminiService.ts` acts as the API Client, normalizing backend responses for the UI.

### Backend Responsibilities (Orchestrator)
- **Prompt Engineering**: Dynamically assembles:
  - System Instructions (Persona)
  - **User Profile Summary** (from Mem0)
  - **Relevant Memories** (from Mem0, filtered by query)
  - **Document Snippets** (from txtai, Top-K)
- **Persistence**: Transactions for Chat History + Memory updates.

---

## 2. API Endpoints Specification

The `geminiService.ts` adapter consumes these endpoints:

### Authentication
- `POST /auth/google/start`: Initiate OAuth flow.
- `POST /auth/google/callback`: Handle redirect and set session.
- `POST /auth/logout`: clear cookies.
- `GET /me`: Return `User` object and global settings.

### Chat & Orchestration
- `GET /conversations`: List threads by Project.
- `GET /conversations/:id/messages`: specific history.
- `POST /conversations/:id/messages`: **Main Interaction**.
  - **Payload**: `{ content: string, attachments: Attachment[], activePersonaId: string, activeDocIds: string[] }`
  - **Process**:
    1. **Retrieve**: Parallel call to `mem0.search(user_id, query)` and `txtai.search(query, doc_ids)`.
    2. **Assemble**: Construct context window.
    3. **Generate**: Call Gemini.
    4. **Store**: Async write to Mem0 (add_memory) and Postgres (messages).
  - **Response**: `{ text: string, citations: Citation[], agreementProposal?: Agreement }`

### Memory Management
- `GET /memory/profile/:userId`: Get the "Pinned" facts Mem0 has inferred about the user.
- `POST /memory/retrieve`: Debug endpoint to manually fetch memories for a query.

### Documents (RAG)
- `POST /docs/upload`: Request Signed URL (GCS) for file upload.
- `POST /docs/ingest`: Trigger background indexing.
  - **Logic**: Backend downloads file -> parses text -> chunks (500 tokens) -> `txtai` embeds -> `pgvector` insert.
- `GET /docs/query`: Test semantic search.
- `DELETE /docs/:id`: Remove file and associated vectors.

### Calendar
- `POST /calendar/connect`: Link Google account.
- `POST /calendar/sync`: Force sync events to local DB.
- `GET /calendar/events`: Fetch synced events.

---

## 3. RAG & Memory Logic

### RAG Strategy (txtai + pgVector)
- **Indexing**: Documents are split into overlapping chunks. txtai calculates embeddings.
- **Storage**: Chunks stored in `document_chunks` table with a `vector(768)` column.
- **Retrieval**: 
  - Backend performs a hybrid search (Keyword + Vector).
  - Returns **Top-K (e.g., 5)** chunks.
  - Snippets are appended to the System Instruction with `[Source: DocName]` citations.

### Memory Strategy (Mem0)
- **Ingestion**: Every User/Assistant turn is sent to Mem0.
- **Fact Extraction**: Mem0 analyzes the turn for long-term facts (e.g., "User prefers dark mode", "User is working on Project X").
- **Retrieval**:
  - **Profile**: A consolidated summary of the user (Role, preferences, key relationships).
  - **Semantic Search**: Fetches past interactions relevant to the *current* prompt.
- **Filtering**:
  - PII Filters: Regex to redact emails/phones before storage.
  - Category Filters: Exclude 'casual_chitchat' from long-term storage.

---

## 4. Database High-Level Tables

- **users**: `id, email, google_id, avatar, role`
- **projects**: `id, name, description, theme, owner_id`
- **conversations**: `id, project_id, created_at`
- **messages**: `id, conversation_id, role, content, attachments (JSONB)`
- **documents**: `id, project_id, name, gcs_path, status`
- **document_chunks**: `id, document_id, content, embedding (VECTOR)`
- **mem0_memories**: (Managed by Mem0, but mapped to `user_id`)
- **calendar_events**: `id, project_id, title, start, end, google_event_id`


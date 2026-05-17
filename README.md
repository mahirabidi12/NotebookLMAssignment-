# NotebookLM Clone — RAG Document Chat

A Google NotebookLM-inspired app that lets you upload a document (PDF, TXT, or CSV) and chat with it using AI. Built on a full RAG pipeline with HyDE (Hypothetical Document Embeddings) for improved retrieval accuracy.

**Live:** [Frontend on Vercel](https://notebooklmassignment.vercel.app) · [Backend on Render](https://notebooklmassignment.onrender.com)

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Backend | Node.js + Express (ES Modules) |
| Database | MongoDB Atlas (vector search) |
| Embeddings | NVIDIA NIM — `nvidia/nv-embedqa-e5-v5` (1024 dims) |
| LLM | Google Gemini `gemini-2.5-flash` |

---

## Architecture

### Ingest Pipeline (Upload → Store)

When a user uploads a file, the backend runs this pipeline:

```
File Upload (PDF / TXT / CSV)
        │
        ▼
   Parse to Pages
   (pdf-parse / raw text / CSV rows)
        │
        ▼
  Recursive Text Chunking
  chunkSize: 800 chars, overlap: 150
        │
        ▼
  Batch Embed Chunks
  NVIDIA NIM  ·  input_type: "passage"
  batches of 10 to respect rate limits
        │
        ▼
  Insert into MongoDB Atlas
  each chunk stored with:
  docId · filename · text · embedding · pageNumber · chunkIndex
```

Each uploaded document gets a UUID (`docId`) that ties all its chunks together in the database. The vector index on MongoDB Atlas is scoped per-document using a `filter` on `docId`.

### Query Pipeline — HyDE RAG (Question → Answer)

Standard RAG embeds the raw question and searches for similar chunks. The problem: a question and a document passage sit in different parts of the embedding space, so retrieval can miss relevant content.

This app uses **HyDE (Hypothetical Document Embeddings)** to close that gap:

```
User Question
      │
      ▼
 Gemini generates a hypothetical passage
 (a fake but plausible 2–4 sentence answer)
      │
      ▼
 Embed the hypothetical passage
 NVIDIA NIM  ·  input_type: "passage"
      │
      ▼
 $vectorSearch on MongoDB Atlas
 numCandidates: 20 · limit: 5 · filter: { docId }
      │
      ▼
 Retrieved real chunks from the document
      │
      ▼
 Gemini generates final answer
 strictly grounded in retrieved chunks
      │
      ▼
 Answer returned to user
```

The hypothetical passage is ephemeral — it is never stored. It exists only to produce a query vector that sits closer to document chunk embeddings than the raw question would. The final answer is always generated from real retrieved chunks, so there is no hallucination risk from the HyDE step.

### Why HyDE over Corrective RAG?

Corrective RAG adds a relevance-grading step after retrieval and falls back to web search when chunks are irrelevant. This app is document-scoped (you chat with your own upload, not the web), so there is no meaningful fallback — Corrective RAG's "correction" would collapse to just query rewriting. HyDE achieves better retrieval at lower complexity with one extra LLM call.

---

## Project Structure

```
NotebookLMAssignment-/
├── backend/
│   ├── config/
│   │   └── db.js                  # Mongoose connection
│   ├── models/
│   │   └── Chunk.js               # MongoDB schema (docId, text, embedding, …)
│   ├── routes/
│   │   ├── ingest.js              # POST /api/ingest — upload & embed
│   │   └── query.js               # POST /api/query  — HyDE + search + answer
│   ├── services/
│   │   ├── chunker.js             # Recursive character text splitter
│   │   ├── embeddingService.js    # NVIDIA NIM embedding calls
│   │   ├── geminiService.js       # Gemini content generation
│   │   ├── hydeService.js         # HyDE — generates hypothetical passage
│   │   └── pdfParser.js           # PDF / TXT / CSV extraction
│   ├── server.js
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── UploadPanel.jsx    # Drag & drop upload with progress
    │   │   └── ChatPanel.jsx      # Chat UI with typing indicator
    │   ├── api.js                 # Axios wrappers (ingestFile, queryDocument)
    │   ├── App.jsx
    │   └── App.css                # Dark theme, two-panel layout
    └── vite.config.js             # Dev proxy: /api → localhost:8000
```

---

## Key Implementation Details

**Chunking** — `chunker.js` implements recursive character splitting. It tries to split on `\n\n` first, then `\n`, then spaces, then characters. This preserves paragraph and sentence boundaries as much as possible. Chunks shorter than 20 characters are filtered out.

**Embedding** — `embeddingService.js` uses `input_type: "passage"` for all document chunks (and for HyDE hypothetical passages). The NVIDIA model treats passage and query embeddings differently — matching passage-to-passage improves similarity scores.

**PDF parsing** — `pdfParser.js` uses `createRequire` to import `pdf-parse` inside an ES Module project (pdf-parse is CJS and has a test-file side-effect on direct import). Per-page text is extracted via the `pagerender` callback.

**MongoDB vector index** — created in Atlas Search with `numDimensions: 1024` and a `filter` on the `docId` field, which allows `$vectorSearch` to scope results to a single document without a post-filter step.

---

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB Atlas cluster with a vector search index (see below)
- NVIDIA NIM API key
- Google AI Studio API key (`gemini-2.5-flash` access)

### MongoDB Atlas Vector Index

In Atlas → Search → Create Search Index → JSON editor, on the `chunks` collection:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1024,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "docId"
    }
  ]
}
```

Name the index `vector_index`.

### Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/embeddings
GOOGLE_API_KEY=your_google_api_key
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/notebooklm
PORT=8000
```

### Run

```bash
# Backend
cd backend
npm install
node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. The Vite dev proxy forwards `/api` requests to `http://localhost:8000`.

---

## Deployment

**Backend — Render**

Set environment variables in Render dashboard (same keys as `.env`). Deploy as a Node.js web service with start command `node server.js`.

**Frontend — Vercel**

Set `VITE_API_URL=https://your-render-url.onrender.com` in Vercel's environment variables before building. Vercel auto-detects Vite and runs `npm run build`.

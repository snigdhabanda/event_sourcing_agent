# SF Events

A public, read-only web app that aggregates San Francisco events from several sources and makes them **semantically searchable**. Events are crawled weekly, embedded, and stored in Postgres; search fuses full-text and vector similarity.

## Stack

- **Next.js** (App Router) — frontend + API routes, deployed on **Vercel**
- **React + Tailwind v4** — UI
- **Neon** — serverless Postgres with **pgvector**
- **Drizzle ORM** — schema + migrations + queries
- **Claude** (`claude-opus-4-8`) — the agent that extracts events from unstructured sources
- **OpenAI** `text-embedding-3-small` (1536-dim) — embeddings
- **QStash** (Upstash) — push-based job queue for fan-out crawling

## How it works

```
Vercel Cron (weekly)
      │  GET /api/cron        (CRON_SECRET protected)
      ▼
  enqueue one QStash job per source  ──►  QStash
                                            │  POST /api/crawl  { sourceId }   (signature verified)
                                            ▼
                                   extract ─► embed + dedupe ─► Neon
                                   (agent | luma parser)   (pipeline)

  Browser ──► GET /api/search?q=…  ──►  embed query + hybrid search (RRF)  ──►  Neon
```

- **Extraction** has two strategies, chosen per source by `kind` (see [sources.config.ts](sources.config.ts)):
  - `structured` — parse embedded JSON directly (Luma). Cheap, deterministic, no LLM.
  - `agent` — Claude with two tools (`fetch_url`, `record_events`) for unstructured sources (Substack).
- **Write-time dedup** ([src/pipeline/upsert.ts](src/pipeline/upsert.ts)) — `dedupe_key = lower(title) | date | lower(location)`, source-agnostic, so re-crawls and cross-source duplicates collapse to one row. Embeddings are computed only for new/changed events.
- **Hybrid search** ([src/db/queries.ts](src/db/queries.ts)) — Postgres full-text (`tsvector`/GIN) + pgvector (HNSW), fused with Reciprocal Rank Fusion (k=60). Past events are filtered at query time.

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `ANTHROPIC_API_KEY` | Claude (the agent) |
| `ANTHROPIC_BASE_URL` | optional — gateway override |
| `OPENAI_API_KEY` | embeddings |
| `OPENAI_BASE_URL` | optional — gateway override |
| `QSTASH_TOKEN` | publish crawl jobs |
| `QSTASH_CURRENT_SIGNING_KEY` / `QSTASH_NEXT_SIGNING_KEY` | verify incoming QStash requests |
| `CRON_SECRET` | protects `/api/cron` |
| `APP_URL` | public base URL QStash posts back to |

### 3. Database

The first migration enables pgvector itself (`CREATE EXTENSION IF NOT EXISTS vector;`), so a single command sets up a clean Neon database:

```bash
npm run db:migrate
```

To regenerate after a schema change:

```bash
npm run db:generate   # writes a new file to drizzle/
npm run db:migrate    # applies it
```

> Note: `drizzle-kit generate` does **not** emit `CREATE EXTENSION`. The current migration has it prepended by hand. If you regenerate from scratch, re-add `CREATE EXTENSION IF NOT EXISTS vector;` as the first statement.

### 4. Run

```bash
npm run dev      # http://localhost:3000
```

## Deployment (Vercel)

- [vercel.json](vercel.json) defines the weekly cron (`0 14 * * 1` — Mondays 14:00 UTC) hitting `/api/cron`.
- Set every env var above in the Vercel project settings. `APP_URL` must be the deployed URL (QStash posts crawl jobs back to it).
- `/api/crawl` sets `maxDuration = 300` — **requires Vercel Pro** (Hobby caps at 60s). The agent-driven Substack crawl is the only job likely to need it.

## Triggering a crawl manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>/api/cron
```

## Known limitations

- **Dedup is exact, not semantic.** The key catches case/whitespace differences, but if two sources phrase a location differently (`"SoMa, SF"` vs `"South of Market"`), the same real-world event can land as two rows.
- **The Substack source is a single weekly post**, and its URL changes each week ([sources.config.ts](sources.config.ts)). Either update the URL weekly, or repoint the agent at the publication root and let it find the latest post.
- **Small corpus.** Semantic search shines at scale; with a few hundred events the full-text half of the hybrid often carries most of the weight.

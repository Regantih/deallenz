# DealLens Architecture

> **Status:** PR#3 — Path B + Agent Swarm + MVI Router (mocks). Real LLM and storage adapters land in PR#5.

---

## Overview

DealLens enriches VC deal records through a **five-phase pipeline**:

```
Path A (file upload)  ─┐
Path B (link ingest)  ─┤→  SwarmOrchestrator  →  CostLedger  →  deal.html memo
Chat intake           ─┘
```

Every component is behind an **interface** so mocks can substitute for real providers during development, and real adapters can be dropped in without touching the orchestrator or UI.

---

## 1. Storage Abstraction (`lib/storage.ts`)

### Interface

```typescript
interface StorageClient {
  putFile(dealId, data, name, mimeType): Promise<UploadedFile>;
  getSignedUrl(key, expiresInSeconds?): Promise<string>;
  listDealFiles(dealId): Promise<UploadedFile[]>;
}
```

### Implementations

| File | Status | Backend |
|---|---|---|
| `lib/storage.mock.ts` | ✅ PR#3 | Writes to `/tmp/deallenz-mock-storage/` |
| `lib/storage.supabase.ts` | 🔜 PR#2 | Supabase Storage |

**Guard:** `MockStorageClient` throws at import time if `NODE_ENV === 'production'` AND `USE_MOCKS !== 'true'`.

---

## 2. MVI Model Router (`lib/llm.ts`)

### What is MVI?

**Mixture of Verified Inferences** — a cost-aware routing strategy that assigns each LLM call to the cheapest model tier that is adequate for the task, with automatic downgrade if a per-call budget is set.

### Tier Mapping

| Tier | Anthropic | OpenAI | Default tasks |
|---|---|---|---|
| `cheap` | `claude-haiku-4-5` | `gpt-4o-mini` | `extract`, `classify` |
| `mid` | `claude-sonnet-4-5` | `gpt-4o` | `research`, `analyze`, `critique` |
| `deep` | `claude-opus-4-5` | `o1` | `write` |

### Downgrade Logic

```
resolveTier(taskType, { cost_budget_usd, tokens_estimate })
  1. Start at default tier for taskType (or tier_override)
  2. While estimated_cost > budget AND tier > cheap:
       tier = tier - 1  (deep → mid → cheap)
  3. Return resolved tier
```

### Pricing (Anthropic, May 2025)

| Tier | In ($/M) | Out ($/M) |
|---|---|---|
| cheap | $0.80 | $4.00 |
| mid | $3.00 | $15.00 |
| deep | $15.00 | $75.00 |

### CostLedger JSON Shape

Every deal gets a `cost_ledger` appended to its JSON record after swarm completes:

```json
{
  "cost_ledger": {
    "deal_id": "pqc-bank",
    "entries": [
      {
        "call_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "deal_id": "pqc-bank",
        "agent": "researcher",
        "task_type": "research",
        "model": "claude-sonnet-4-5",
        "tokens_in": 3500,
        "tokens_out": 800,
        "usd_cost": 0.0225,
        "duration_ms": 1200,
        "timestamp": "2025-05-10T14:32:00.000Z"
      }
    ],
    "total_usd": 0.412,
    "total_tokens_in": 18400,
    "total_tokens_out": 5500
  }
}
```

The cost-transparency UI (PR#4) reads this shape from `deal.swarm_output.cost_ledger`.

### Implementations

| File | Status |
|---|---|
| `lib/llm.mock.ts` — `MockModelRouter` | ✅ PR#3 |
| `lib/llm.anthropic.ts` | 🔜 PR#5 |
| `lib/llm.openai.ts` | 🔜 PR#5 |

---

## 3. Agent Swarm (`lib/swarm/`)

### Orchestration Phases

```
┌─────────────────────────────────────────────────────────┐
│                   SwarmOrchestrator                     │
│                                                         │
│  PLAN        → define agent sequence                    │
│  DISPATCH    → ResearcherAgent ─┐                       │
│                AnalystAgent    ─┼─ (parallel)           │
│                RiskAgent       ─┘                       │
│  GATHER      → collect all results                      │
│  COMPOSE     → WriterAgent (14 chapters, 3 per batch)   │
│  CRITIQUE    → CriticAgent (14-point rubric)            │
│  FINALIZE    → merge + emit OrchestratorSummary         │
└─────────────────────────────────────────────────────────┘
```

### Agent Contracts

| Agent | File | Task types | Output |
|---|---|---|---|
| **ResearcherAgent** | `agents/researcher.ts` | `research` | `ResearcherOutput` (market, competitors, macro, sources) |
| **AnalystAgent** | `agents/analyst.ts` | `classify`, `analyze` | `AnalystOutput` (CAC, LTV, payback, burn multiple, Rule of 40, TAM/SAM/SOM) |
| **RiskAgent** | `agents/risk.ts` | `analyze` | `RiskOutput` (risk register, red flags, overall severity) |
| **WriterAgent** | `agents/writer.ts` | `write` | `WriterOutput` (14 chapter drafts, word count) |
| **CriticAgent** | `agents/critic.ts` | `critique` | `CriticOutput` (rubric, pass rate, blocking failures, approved) |

### Critic Rubric (14 items)

| ID | Blocking | Check |
|---|---|---|
| R01 | ✅ | Every chapter ≥ 100 words |
| R02 | ✅ | No invented data without source |
| R03 | ✅ | No `[MOCK]`, lorem ipsum, or placeholders |
| R04 | ❌ | At least one cited real URL per chapter |
| R05 | ✅ | Verdict chapter has clear pass/fail recommendation |
| R06 | ❌ | Risk register covers ≥ 3 categories |
| R07 | ❌ | Unit economics shows metrics or explains missing inputs |
| R08 | ❌ | Team chapter addresses founder–market fit |
| R09 | ❌ | Competition chapter names real companies |
| R10 | ❌ | Macro chapter references real indicator or policy |
| R11 | ✅ | No contradictions between traction numbers |
| R12 | ❌ | Geo chapter addresses HQ jurisdiction risks |
| R13 | ❌ | Chapter numbers are sequential 01–14 |
| R14 | ✅ | No deferred-content placeholders |

---

## 4. Path B — Link Ingest (`api/ingest-link.ts`)

### Supported Sources

| Source | Pattern | Connector status |
|---|---|---|
| Google Drive folder | `drive.google.com/drive/folders/` | 🔜 PR#5 (Drive API) |
| Google Drive file | `drive.google.com/file/d/` | 🔜 PR#5 |
| Dropbox folder | `dropbox.com/sh/` or `dropbox.com/scl/fo/` | 🔜 PR#5 (Dropbox SDK) |
| Notion page | `notion.so/` | 🔜 PR#5 (Notion API) |
| Generic HTTPS page | Any other `https://` URL | 🔜 PR#5 (Firecrawl) |

### Request / Response

```
POST /api/ingest-link
Content-Type: application/json

{ "url": "https://drive.google.com/drive/folders/...", "deal_id": "pqc-bank" }

200 OK
{ "ok": true, "job_id": "job-1234-abc", "source_type": "google_drive_folder" }

400 Bad Request
{ "ok": false, "error": "INSECURE_URL", "detail": "Only HTTPS URLs are accepted." }
```

### Job Lifecycle

```
queued → processing → done
                   ↘ failed (with error field)
```

Polled via `GET /api/ingest-link?job_id=<id>` (adapter TBD in PR#5).

### Queue

| File | Status |
|---|---|
| `api/ingest-queue.mock.ts` — `MockIngestQueue` | ✅ PR#3 |
| Real queue (Supabase pgmq or Cloudflare Queues) | 🔜 PR#5 |

---

## 5. Mock Guards

All mock classes enforce a runtime guard:

```typescript
if (process.env.NODE_ENV === 'production' && process.env.USE_MOCKS !== 'true') {
  throw new Error('[deallenz] MockXxx must not be used in production.');
}
```

This prevents accidental production deployment of stub code.
`USE_MOCKS=true` can be set for staging environments.

---

## 6. Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose | Required |
|---|---|---|
| `NODE_ENV` | `development` / `production` | Always |
| `USE_MOCKS` | `true` to allow mocks in production (staging only) | Optional |
| `MOCK_STORAGE_ROOT` | Override `/tmp/deallenz-mock-storage` path | Optional |
| `ANTHROPIC_API_KEY` | Real LLM calls (PR#5) | PR#5+ |
| `OPENAI_API_KEY` | OpenAI fallback (PR#5) | PR#5+ |
| `SUPABASE_URL` | Supabase project URL (PR#2) | PR#2+ |
| `SUPABASE_ANON_KEY` | Supabase anon key (PR#2) | PR#2+ |

---

## 7. File Map

```
deallenz/
├── api/
│   ├── ingest-link.ts          # Path B route handler (framework-agnostic)
│   └── ingest-queue.mock.ts    # In-memory job queue (mock)
├── lib/
│   ├── storage.ts              # StorageClient interface
│   ├── storage.mock.ts         # MockStorageClient (/tmp)
│   ├── llm.ts                  # ModelRouter interface + MVI routing + CostLedger
│   ├── llm.mock.ts             # MockModelRouter (stub responses + realistic costs)
│   └── swarm/
│       ├── orchestrator.ts         # Plan/dispatch/gather/compose/critique/finalize
│       └── agents/
│           ├── researcher.ts
│           ├── analyst.ts
│           ├── risk.ts
│           ├── writer.ts
│           └── critic.ts
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── DECISIONS.md
│   ├── EXPECTATIONS.md
│   └── Multi_Agent_VC_Platform_Scope.md
├── submit.html                 # Path A + Path B intake UI
├── deal.html                   # 14-chapter memo viewer
├── tsconfig.json
└── .env.example
```

---

## 8. Decision Log References

| Decision | Impact |
|---|---|
| D-010 | MVI router resolves model per task type; Opus reserved for writing only |
| D-017 | Every chapter must cite a source; CriticAgent rubric R04 enforces this |
| D-018 | Macro data sources: FRED, World Bank, OFAC, BIS, USTR |
| D-019 | Unit economics canonical definitions (CAC, LTV, payback, burn multiple, NDR) |
| D-021 | StorageClient interface; real Supabase adapter in PR#2 |
| D-022 | MockModelRouter returns deterministic stubs; USE_MOCKS gate prevents prod use |
| D-023 | Path B: Google Drive + Dropbox first; email-forward deferred |
| D-024 | Critic rubric: 14 items, 6 blocking; approved=true only when all blocking pass |

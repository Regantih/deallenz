# CLAUDE.md — DealLens Build Specification

You are the sole engineer building DealLens for Marketlogic Investors LLC.
You do not stop until the app works. You do not claim success until you have tested it yourself.

## The Iron Rule

**NEVER say "verified", "tested", or "working" unless you personally executed the code path and observed the output.** Running `npm run type-check` is not testing. Running `npm run build` is not testing. Testing means: start the server, make the HTTP request, read the response body, and confirm it contains the expected data. If you cannot test a browser flow (PDF upload → agent extraction), build a Node.js script that replicates the exact request sequence and verify the response payloads.

---

## What DealLens Is

A VC deal analysis platform. An analyst uploads a pitch deck PDF. Four AI agents analyze it in parallel (research, financials, risk, team). A writer agent composes a 14-chapter investment memo. A critic agent QA-gates it. The memo renders in a scrollytelling editorial format.

Target output example: `https://marketlogicinvestors.github.io/investments-vault/vc-deals/innerwell/?nocache=1`

---

## Machine Environment

- **Host:** NVIDIA DGX Spark, Ubuntu
- **Working directory:** `/home/neuralspark/deallens` (canonical repo from `github.com/Regantih/deallenz`)
- **Supabase project:** `kipyuhjbtkyhfapinwgj` (us-west-1), bucket `deal-uploads` exists
- **Node.js:** installed, npm available
- **API Keys available in `.env.local`:**
  - `ANTHROPIC_API_KEY` — active, supports `claude-sonnet-4-5-20250929` and `claude-haiku-4-5-20250929`
  - `OPENAI_API_KEY` — for embeddings (`text-embedding-3-small`)
  - `OPENROUTER_API_KEY` — fallback only, do not use for swarm
  - Supabase URL, anon key, service role key

---

## Known Bugs From Previous Session (Fix ALL of these)

These were diagnosed through manual testing. Each one caused silent failures that the previous build agent claimed were "verified."

### Bug 1: `pdf-parse` v2.4.5 is class-based, not function-based
The installed `pdf-parse` package exports `{ PDFParse }` (a class), not a default function.
```typescript
// WRONG — crashes at runtime with "pdfParser is not a function"
import pdf from 'pdf-parse';
await pdf(buffer);

// CORRECT
const { PDFParse } = require('pdf-parse');
const parser = new PDFParse({ data: buffer });
const result = await parser.getText();
const pages = result.pages.map((p: any) => p.text);
await parser.destroy();
```
Additionally, `next.config.ts` MUST include `serverExternalPackages: ['pdf-parse']` or the worker file resolution fails at runtime with "Cannot find module './pdf.worker.mjs'".

### Bug 2: `/api/upload` does not return extracted text
The upload route returns `{ documentId, pagesCount }` but NOT the parsed text. The client-side code references `d.text` which is always `undefined`. The intake agent receives an empty string instead of the pitch deck content.
**Fix:** Add `text: pagesText.join('\n\n')` to the upload response JSON.

### Bug 3: Wrong Anthropic model names
These models do NOT exist on the active API key and return 404:
- `claude-3-5-sonnet-20241022` ❌
- `claude-3-5-sonnet-latest` ❌  
- `claude-sonnet-4-20250514` ❌

The ONLY working models are:
- `claude-sonnet-4-5-20250929` (mid-tier: analysis, writing, critique)
- `claude-haiku-4-5-20250929` (cheap tier: classification, simple extraction)

**Search the entire codebase** for any occurrence of `claude-3`, `claude-sonnet-4-2025051`, or `claude-3-5` and replace with the correct model names. Check: `lib/llm.ts`, `lib/llm.anthropic.ts`, `lib/llm.mock.ts`, `app/api/chat/route.ts`, `app/api/memo/route.ts`, `submit.html`, `public/submit.html`, and any other file.

### Bug 4: `USE_LOCAL_LLM` defaults to `true`
In `lib/llm.ts`, the local vLLM check uses `process.env.USE_LOCAL_LLM !== 'false'`, which means when the env var is undefined, it defaults to trying a local server at localhost:8000. If anything is running on that port, it returns stale/mock data silently.
**Fix:** Set `USE_LOCAL_LLM=false` in `.env.local`. Also set `USE_LOCAL_EMBEDDINGS=false`.

### Bug 5: `/api/runs` doesn't pass pitch deck text to swarm agents
The runs endpoint selects only `id, name, stage, status` from the deals table. The agents receive no pitch deck content, no thesis, no ARR, no financial data. They generate generic "insufficient data" responses.
**Fix:** Select `*` from deals. Query `deal_files` → `documents` → `document_pages` to load the full pitch deck text. Pass it as `pitch_deck_text` on the deal record to the orchestrator.

### Bug 6: Database status constraint violation
The `deals` table has a CHECK constraint that only allows: `'intake'`, `'enriching'`, `'review'`, `'ic-review'`, `'closed-won'`, `'closed-lost'`. The value `'memo-ready'` is NOT allowed and causes silent update failures.
**Fix:** Map any swarm completion status to `'review'` before writing to the database.

### Bug 7: `writer.ts` doesn't strip markdown code fences
When Claude returns chapter JSON wrapped in ` ```json ... ``` `, the `parseChapterDraft` function calls `JSON.parse(content)` which fails, and the fallback stores the raw fenced string as the chapter body.
**Fix:** Strip ` ```json ` prefix and ` ``` ` suffix before parsing.

### Bug 8: Supabase RLS permissions
Tables created by migrations may not grant privileges to `service_role`. Run this SQL via the admin client or provide it for manual execution:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role, anon, authenticated;
ALTER TABLE public.deal_runs ADD COLUMN IF NOT EXISTS swarm_output JSONB;
```

### Bug 9: `submit.html` falls back to hardcoded questions
When the API key field is empty OR the provider is set to "local", the page runs `localExtract()` — a dumb regex engine that asks "What's the company name?" sequentially. The AI never runs.
**Fix:** Ensure the API key is pre-populated in the HTML default value, and the provider defaults to "Anthropic (Claude)".

### Bug 10: Null bytes in PDF text crash Postgres
Some PDFs contain `\u0000` characters. Postgres TEXT columns reject them.
**Fix:** Strip null bytes from all page text before database insertion: `text.replace(/\u0000/g, '')`.

---

## The Build-Test-Fix Loop

Execute this loop. Do not exit until all acceptance tests pass.

```
WHILE acceptance_tests_failing:
    1. Read the failing test output
    2. Diagnose the root cause (read the actual code, don't guess)
    3. Apply the fix
    4. Run `npm run type-check` — fix any type errors
    5. Restart dev server: `rm -rf .next && npm run dev -- -H 0.0.0.0 &`
    6. Wait for "✓ Ready" in stdout
    7. Re-run the failing acceptance test
    8. If it passes, move to the next test
    9. If it fails with a NEW error, loop back to step 1
    10. If it fails with the SAME error, your fix was wrong — re-read the code
```

---

## Acceptance Tests

Build these as executable Node.js scripts in `tests/`. Each test must make real HTTP requests to `http://localhost:3000` and verify response payloads. Each test prints PASS or FAIL with the actual vs expected output on failure.

### Test 1: Health Check
```
GET /api/health
Expected: { supabase: "ok", anthropic: "ok", version: "0.5.0" }
FAIL if: any field is not "ok", or HTTP status is not 200
```

### Test 2: PDF Upload Returns Text
```
POST /api/upload
Body: multipart/form-data with a real PDF file from ~/Downloads/
Expected response contains:
  - ok: true
  - pagesCount: number > 0
  - text: string with length > 100
  - documentId: string (UUID)
FAIL if: text is undefined, null, empty, or missing
```

### Test 3: Anthropic API Model Works
```
Direct Anthropic API call using the key from .env.local
Model: claude-sonnet-4-5-20250929
Prompt: "Reply with exactly: PING"
Expected: response.content[0].text contains "PING"
FAIL if: 404, model not found, or timeout
```

### Test 4: Deal Creation
```
POST /api/deals
Body: { name: "Test Corp", stage: "seed", sector: "saas", thesis: "test" }
Expected: { ok: true, deal_id: string }
Verify: SELECT from deals table where id = deal_id returns the record
FAIL if: 401, 500, or deal not found in DB
```

### Test 5: Swarm Run Completes
```
POST /api/runs
Body: { deal_id: <from test 4> }
Expected: { ok: true, run_id: string, status: "running" }
Then poll deal_runs table every 5 seconds for up to 3 minutes:
  - When status = "done": check swarm_output is not null, has 14 chapters
  - Each chapter.body must be > 50 characters
  - No chapter.body should contain "```json"
  - At least 3 chapters should reference the deal name, not "Innerwell"
FAIL if: status = "failed", timeout after 3 min, or chapters reference wrong company
```

### Test 6: Deal Detail API Returns Memo
```
GET /deals/<deal_id>.json (or /deals/<deal_id>/route)
Expected: JSON with deal record + latest run + swarm_output chapters
FAIL if: 404, empty chapters, or "No data"
```

### Test 7: No Hardcoded Model Names
```
grep -r "claude-3-5" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html" .
grep -r "claude-sonnet-4-2025051" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.html" .
Expected: zero matches (excluding node_modules, .next, .git)
FAIL if: any match found
```

### Test 8: No USE_LOCAL_LLM Leak
```
Read .env.local
Expected: USE_LOCAL_LLM=false
Expected: USE_LOCAL_EMBEDDINGS=false
Also check lib/llm.ts: if USE_LOCAL_LLM is not in env, it must default to false, not true
FAIL if: defaults to true or env var is missing
```

---

## Build Sequence

### Phase 1: Environment & Dependencies
1. `cd /home/neuralspark/deallens`
2. Verify `package.json` has pinned versions:
   - `@anthropic-ai/sdk`: `0.95.1`
   - `@supabase/supabase-js`: `2.49.4`
   - `next`: `15.3.9`
3. `npm install`
4. Verify/create `.env.local` with all required keys
5. Set `USE_LOCAL_LLM=false`, `USE_LOCAL_EMBEDDINGS=false`, `USE_MOCKS=false`
6. Add `serverExternalPackages: ['pdf-parse']` to `next.config.ts`

### Phase 2: Fix All Known Bugs
Apply fixes for Bugs 1–10 listed above. After each fix, run `npm run type-check`.

### Phase 3: Database Setup
1. Check if tables exist by querying Supabase
2. If missing, run migrations or execute SQL directly via the admin client
3. Run the GRANT statements for RLS
4. Add `swarm_output JSONB` column to `deal_runs` if missing
5. Verify by querying each table

### Phase 4: Build & Start
1. `npm run type-check` — must pass with 0 errors
2. `npm run build` — must compile successfully
3. `rm -rf .next && npm run dev -- -H 0.0.0.0 &`
4. Wait for "✓ Ready"
5. `curl http://localhost:3000/api/health` — must return `{ supabase: "ok", anthropic: "ok" }`

### Phase 5: Run Acceptance Tests
Execute tests 1–8 in sequence. If any fail, enter the Build-Test-Fix loop.

### Phase 6: Full E2E Smoke Test
1. Upload `~/Downloads/Emerald AI Investment Memo (V2) (2).pdf` via POST /api/upload
2. Verify the response contains `text` with actual PDF content (not empty)
3. Create a deal with the extracted fields
4. Trigger POST /api/runs with the deal_id
5. Poll until status = "done" (max 3 minutes)
6. Verify the swarm_output contains 14 chapters about Emerald AI (not Innerwell)
7. Verify at least one chapter mentions "grid" or "data center" or "energy" (domain-specific to Emerald)
8. Verify cost_ledger has entries for this run

---

## Architecture Quick Reference

```
submit.html          → intake chat (browser-side Anthropic call)
                     → PDF upload via /api/upload
                     → deal creation via /api/deals
                     → redirects to deals.html

deals.html           → Kanban pipeline board
                     → reads from /deals/index.json

deal.html?id=X       → scrollytelling memo viewer
                     → reads from /deals/X.json
                     → renders 14 chapters from swarm_output

/api/upload          → accepts PDF, parses pages, generates embeddings
                     → stores in Supabase Storage + documents + document_pages
                     → MUST return { text, documentId, pagesCount }

/api/deals           → creates deal record in deals table
                     → links uploaded document via deal_files

/api/runs            → triggers SwarmOrchestrator
                     → loads pitch deck text from document_pages
                     → runs: researcher + analyst + risk (parallel) → writer → critic
                     → writes swarm_output to deal_runs, cost entries to cost_ledger

/api/health          → checks Supabase + Anthropic connectivity

lib/llm.ts           → unified LLM client (local vLLM → Anthropic fallback)
lib/llm.anthropic.ts → Anthropic model router for swarm agents
lib/llm.mock.ts      → mock router (USE_MOCKS=true only)
lib/embeddings.ts    → unified embeddings (local → OpenAI fallback)
lib/swarm/           → orchestrator + 5 agents (researcher, analyst, risk, writer, critic)
```

---

## File Locations

| File | Purpose |
|------|---------|
| `submit.html` + `public/submit.html` | Intake page (MUST be identical) |
| `deals.html` + `public/deals.html` | Pipeline board (MUST be identical) |
| `deal.html` + `public/deal.html` | Memo viewer (MUST be identical) |
| `app/api/upload/route.ts` | PDF upload + RAG ingestion |
| `app/api/deals/route.ts` | Deal creation |
| `app/api/runs/route.ts` | Swarm trigger |
| `app/api/health/route.ts` | Health check |
| `app/deals/[id]/route.ts` | Deal detail JSON API |
| `app/deals/index.json/route.ts` | Deal list JSON API |
| `lib/swarm/orchestrator.ts` | Swarm coordinator |
| `lib/swarm/agents/*.ts` | Specialist agents |
| `.env.local` | All secrets and config |
| `next.config.ts` | Next.js config (serverExternalPackages!) |
| `supabase/migrations/*.sql` | Database schema |

---

## LLM Model Configuration

| Tier | Model String | Use Case |
|------|-------------|----------|
| Mid (Sonnet) | `claude-sonnet-4-5-20250929` | Analysis, writing, critique, intake chat |
| Cheap (Haiku) | `claude-haiku-4-5-20250929` | Classification, simple extraction, research |
| Embeddings | `text-embedding-3-small` (OpenAI) | RAG vector generation |

---

## Constraints

- `SUPABASE_SECRET_KEY` is NEVER prefixed with `NEXT_PUBLIC_` and NEVER in client bundles
- All `deal-uploads` bucket reads use server-generated signed URLs
- The `deal-uploads` bucket already exists — do not recreate it
- After ANY code change: `rm -rf .next` before restarting dev server
- Root HTML files and `public/` copies MUST always be identical — after editing one, copy to the other
- Every agent failure must write to `deal_runs` — no silent failures
- Every swarm run must write cost entries to `cost_ledger`

---

## Definition of Done

ALL of the following must be true simultaneously:

1. ✅ `npm run type-check` passes with 0 errors
2. ✅ `npm run build` compiles successfully
3. ✅ `curl localhost:3000/api/health` returns `{ supabase: "ok", anthropic: "ok" }`
4. ✅ All 8 acceptance tests pass
5. ✅ Full E2E smoke test passes (upload Emerald AI deck → swarm produces Emerald-specific 14-chapter memo)
6. ✅ No deprecated model names anywhere in codebase
7. ✅ `USE_LOCAL_LLM=false` in .env.local
8. ✅ Root and public HTML files are identical

Do not print a success summary until ALL conditions are met. If any condition fails, fix it and re-verify ALL conditions (not just the one you fixed).

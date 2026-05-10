# DealLens — Build Plan

> Full spec: [docs/Multi_Agent_VC_Platform_Scope.md](docs/Multi_Agent_VC_Platform_Scope.md)

---

## Vision

Agent-driven VC operating system for Marketlogic Investors LLC.
Five layers (Interface > Orchestration > Agent Swarms > Knowledge > Governance), six swarms (Sourcing, Diligence, Decision, Portfolio, Operations, Learning & Brand).

---

## Phase 0 — MVP (Current)

### Completed
- [x] Intake tab: conversational chat, file upload, link add, text paste, sample deal loader
- [x] Dossier tab: 7-section pre-call research dossier with sticky pills
- [x] Pipeline tab: 6 enrichment agents with live logs and evidence cards
- [x] Call Prep tab: question bank (14 questions, 6 categories), signal capture, decision framework
- [x] IC Memo tab: scrollytelling investment memo with 8 chapters
- [x] Logs tab: observability trace with type filters, timestamps, JSON export
- [x] Upload fix: click handler on dropZone (commit 33126cc)
- [x] Scope doc: docs/Multi_Agent_VC_Platform_Scope.md committed
- [x] IC Memo, Industry Thesis, and Audit Trail download exports (Markdown format)
- [x] Export buttons on IC Memo tab for IC committee distribution
- [x] 14-chapter deal.html with honest empty states and real data from deal JSON
- [x] deals.html pipeline Kanban with 5 stages
- [x] submit.html: conversational intake agent with local heuristic + LLM modes
- [x] pipeline.html: 4-agent enrichment runner with mock evidence
- [x] **PR5: Rendering, exhibits, cost transparency** — branch `pr5/rendering-and-cost-transparency`
  - `styles/tokens.css`: full design-token set (colours, spacing, type scale, z-index, layout)
  - `build.json`: version + commit SHA injected at build; footer reads it on every page
  - `deal.html`: sticky TOC sidebar (IntersectionObserver active state), 14 section anchors, cost & run panel, exhibits panel, print stylesheet, a11y (skip link, focus-visible, ARIA labels, colour contrast AA)
  - `deals.html`, `pipeline.html`, `submit.html`, `index.html`: global app shell (consistent header + footer)
  - `settings.html`: stub page (4 coming-soon cards)
  - No fake data; all empty states honest and actionable

### Bug Fixes
- logCount -> logBadge reference error (commit cc5e20e)
- dropZone click handler for file upload (commit 33126cc)
- Pipeline/Dossier not rendering on direct nav tab click — added renderPipeline() and buildDossier() to go() (commit a1cbb2b)
- buildCostPanel ReferenceError (`usdCost` vs `usd`) fixed in PR5

### Architecture Decisions (PR5)
- **Design tokens**: single `:root` block in `styles/tokens.css`; all pages import it. Backward-compat aliases (`--ink`, `--paper`, etc.) so existing inline CSS keeps working without a big-bang refactor.
- **Build manifest**: `build.json` is a flat JSON file written by the agent at commit time (currently static; CI will overwrite `commit` field). Footer JS fetches it; fails silently if missing.
- **Cost panel**: reads from `deal.cost.*` first, falls back to top-level `deal.*` fields. Shows "Cost data not yet available" if no fields present. No fake numbers.
- **Exhibits**: reads `deck`, `dataroom`, `model` (file link) fields + `exhibits[]` array. Shows "No exhibits attached yet." if all empty. Links open `target="_blank" rel="noopener noreferrer"`.
- **TOC**: auto-generated from CH constant; IntersectionObserver drives active state. On mobile (<960px) it collapses to a horizontal scrolling strip.
- **Print**: hides header, TOC, cost panel, agent tags. Full-width single column. `break-inside:avoid` on sections.
- **Settings**: stub page only; no auth, no Stripe, no backend changes.
- **Global nav**: Pipeline → deals.html | Submit → submit.html | Settings → settings.html (disabled). Active page marked with `aria-current="page"` and underline.

---

## Phase 0 Remaining
- [ ] Connect real LLM API (Claude/OpenAI) for intake chat parsing
- [ ] Real web scraping for enrichment agents (Tavily/Firecrawl MCP)
- [ ] Pre-call dossier agent (autoresearch pattern)
- [ ] IC pre-read drafter agent
- [ ] Knowledge graph foundation (companies, people, deals)
- [ ] Audit log and provenance tracking (structured, not just UI)
- [ ] Persistent storage (localStorage then backend)
- [ ] MVI model router for cost-aware LLM calls
- [ ] Cost ledger showing $ spent per deal
- [ ] Free trial paywall (3 deals/month, $5 LLM cap)

## Phase 1 (90–180 days): Diligence Swarm
- [ ] Founder researcher agent
- [ ] Reference orchestrator agent
- [ ] Customer DD agent
- [ ] Financial modeler agent
- [ ] Devil’s-advocate agent
- [ ] IC orchestrator and returns modeler
- [ ] Conversational chat (talk to the fund’s brain)

## Phase 2 (6–12 months): Sourcing + Portfolio
- [ ] Sourcing swarm (6 agents: triage, prospector, scout, signal, cohort, competitive intel)
- [ ] Portfolio KPI monitor + board prep agents
- [ ] LP reporting agent
- [ ] Conviction calibrator (needs ~50 deals)

## Phase 3 (12–24 months): Learning Loop + Ops
- [ ] Pattern library, thesis evolution, backtesting agents
- [ ] Full operations swarm (fund admin, compliance, pipeline analytics)
- [ ] Cross-pollination, exit scout
- [ ] LP portal

## Phase 4 (24+ months): Productization
- [ ] Multi-tenant for other funds
- [ ] Fund-of-funds workflows
- [ ] Open MCP servers for venture ecosystem

---

## Tech Stack (Target)

| Layer | Choice |
|---|---|
| LLMs | Claude tiered (Opus/Sonnet/Haiku) + OpenAI fallback |
| Agents | Anthropic SDK + MCP; LangGraph for orchestration |
| Knowledge | Neo4j or Postgres graph + pgvector |
| Workflow | Temporal (durable, human checkpoints) |
| MCP tools | Tavily, Firecrawl, Context7, Crunchbase, Pitchbook |
| Frontend | React/TypeScript (current: vanilla HTML/JS) |
| Backend | FastAPI + Postgres + Redis |
| Observability | OpenTelemetry + Grafana; PostHog for usage |

---

## Success Metrics
- Deal-intake to IC pre-read: 1 week (from 3–4 weeks)
- Partner hours per deal screened: 80% reduction
- Conviction calibration: 9/10 deals outperform 6/10 over time
- Pass-then-winner rate: track and learn
- LP NPS improvement from ops swarm

---

## Files
- `app.html` — Main 6-tab application
- `deal.html` — 14-chapter deep-dive deal page (sticky TOC, cost panel, exhibits)
- `deals.html` — 5-stage pipeline Kanban
- `index.html` — Scrollytelling landing / format guide
- `pipeline.html` — 4-agent enrichment runner
- `settings.html` — Settings stub (coming soon)
- `submit.html` — Conversational deal intake
- `styles/tokens.css` — Design tokens (colours, spacing, type scale)
- `build.json` — Build manifest (version + commit SHA)
- `deals/index.json` — Deal index for pipeline board
- `deals/*.json` — Individual deal data files
- `docs/Multi_Agent_VC_Platform_Scope.md` — Full platform spec
- `docs/DECISIONS.md` — Decision log
- `docs/EXPECTATIONS.md` — Charter

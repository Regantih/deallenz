# DealLens — Build Plan

> Full spec: [docs/Multi_Agent_VC_Platform_Scope.md](docs/Multi_Agent_VC_Platform_Scope.md)

---

## Vision

Agent-driven VC operating system for Marketlogic Investors LLC.
Five layers (Interface > Orchestration > Agent Swarms > Knowledge > Governance), six swarms (Sourcing, Diligence, Decision, Portfolio, Operations, Learning & Brand).

---

## Phase 0 — MVP (Current: app.html)

### Completed
- [x] Intake tab: conversational chat, file upload, link add, text paste, sample deal loader
- [x] Dossier tab: 7-section pre-call research dossier with sticky pills
- [x] Pipeline tab: 6 enrichment agents with live logs and evidence cards
- [x] Call Prep tab: question bank (14 questions, 6 categories), signal capture, decision framework
- [x] IC Memo tab: scrollytelling investment memo with 8 chapters
- [x] Logs tab: observability trace with type filters, timestamps, JSON export
- [x] Upload fix: click handler on dropZone (commit 33126cc)
- [x] Scope doc: docs/Multi_Agent_VC_Platform_Scope.md committed

### Bug Fixes
- logCount -> logBadge reference error (commit cc5e20e)
- dropZone click handler for file upload (commit 33126cc)

### Architecture
- Single-file HTML app (app.html) with inline CSS/JS
- Branch: pr4/chat-and-rich-memo
- Live: https://regantih.github.io/deallenz/app.html
- Scrollytelling format inspired by convolution-musical-journey

---

## Phase 0 Remaining (next 90 days)
- [ ] Connect real LLM API (Claude/OpenAI) for intake chat parsing
- [ ] Real web scraping for enrichment agents (Tavily/Firecrawl MCP)
- [ ] Pre-call dossier agent (autoresearch pattern)
- [ ] IC pre-read drafter agent
- [ ] Knowledge graph foundation (companies, people, deals)
- [ ] Audit log and provenance tracking (structured, not just UI)
- [ ] Persistent storage (localStorage then backend)

## Phase 1 (90–180 days): Diligence Swarm
- [ ] Founder researcher agent
- [ ] Reference orchestrator agent
- [ ] Customer DD agent
- [ ] Financial modeler agent
- [ ] Devil's-advocate agent
- [ ] IC orchestrator and returns modeler
- [ ] Conversational chat (talk to the fund's brain)

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
- `deal.html` — 14-chapter deep-dive deal page
- `deals.html` — 5-stage pipeline view
- `index.html` — Scrollytelling landing page
- `pipeline.html` — Pipeline visualization
- `submit.html` — Deal submission form
- `docs/Multi_Agent_VC_Platform_Scope.md` — Full platform spec
- `docs/DECISIONS.md` — Decision log
- `docs/EXPECTATIONS.md` — Charter

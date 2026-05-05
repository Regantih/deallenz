# Multi-Agent VC Platform — Full Scope

A first-principles architecture for a VC fund's agent-driven operating system.

---

## 1. First Principles

A VC fund does five jobs:

1. **Information gathering** (sourcing)
2. **Judgment formation** (diligence)
3. **Capital allocation** (decision)
4. **Value creation** (portfolio support)
5. **Trust maintenance** (LP relations, brand)

The bottleneck is partner judgment under time pressure with imperfect information.

Agent platforms compress time-to-conviction, maintain perfect institutional memory, run parallel workstreams, and close the learning loop. They do **not** replace founder relationships, LP trust, brand, or partner judgment itself.

---

## 2. Layered Architecture

### Layer 5: Interface
- Partner workbench (deal pipeline, portfolio dashboard, decision workflow)
- Analyst console (research drafting, dossier building)
- LP portal (quarterly reports, capital calls, AGM materials)
- Founder portal (limited, for portfolio companies post-investment)
- Conversational chat (talk to the fund's accumulated brain)
- Mobile companion app

### Layer 4: Orchestration
- Workflow engine (Temporal-style durable workflows that survive multi-day human checkpoints)
- Task router (which agent handles which task; routes by skill, cost, latency)
- Context manager (carries deal context across agent handoffs)
- Quality gates (agent self-review + human checkpoints)
- Multi-agent coordination patterns (manager-worker, debate, ensemble)

### Layer 3: Agent Swarms (six)
See Section 3.

### Layer 2: Knowledge & Memory Substrate
- Knowledge graph (entities: companies, people, sectors, theses, deals, outcomes; relationships: invested-in, founded-by, competes-with, references)
- Vector store (semantic search over decks, memos, conversations, research)
- Time-series database (portfolio KPIs, market data, fund metrics)
- Document store (decks, contracts, memos, financial models)
- Identity layer (partners, analysts, LPs, founders, portfolio operators — distinct access scopes)

### Layer 1: Trust & Governance
- Audit log (every agent action structured-logged: trigger, data touched, output, confidence, human approval status)
- Provenance tracking (every claim links to source)
- Human-in-loop checkpoints (mandatory at decision-impacting stages)
- Compliance (KYC, AML, regulatory filings, conflicts checks)
- Access control (role-based, with deal-level conflicts isolation)
- Confidence calibration (every output tagged; tracked against outcomes)

---

## 3. The Six Swarms — Full Agent Inventory

### 3.1 Sourcing Swarm
- Inbound triage agent
- Thesis prospector agent
- Network scout agent
- Signal monitor agent
- Cohort tracker agent
- Competitive intel agent

### 3.2 Diligence Swarm
- Pre-call dossier agent
- Industry analyst agent (autoresearch-pattern)
- Founder researcher agent
- Reference orchestrator agent
- Customer DD agent
- Technical DD agent (deep tech and LLM-era variants)
- Financial modeler agent
- Legal DD agent
- IC pre-read drafter agent
- Devil's-advocate agent

### 3.3 Decision Swarm
- IC orchestrator agent
- Returns modeler agent
- Conviction calibrator agent (cross-deal, cross-partner, longitudinal)
- Term sheet drafter agent
- Deal close coordinator agent

### 3.4 Portfolio Swarm
- KPI monitor agent
- Board prep agent
- Founder support orchestrator agent
- Follow-on assessor agent
- Mark-to-market agent
- Exit scout agent
- Cross-pollination agent

### 3.5 Operations Swarm
- Fund admin agent
- LP reporting agent
- Compliance agent
- Pipeline analytics agent
- Team workflow agent

### 3.6 Learning & Brand Swarm
- Pattern library agent
- Thesis evolution tracker agent
- Backtesting agent
- Brand and content agent
- Network amplification agent

---

## 4. Cross-Cutting Capabilities

### 4.1 Memory Architecture
- Working memory (active task context)
- Episodic memory (per-deal, per-founder interaction history)
- Semantic memory (institutional knowledge graph)
- Procedural memory (how the fund does things — templates, playbooks)

### 4.2 Modern AI Patterns
- Autoresearch (multi-step agentic research with provenance)
- Plan-execute-reflect loops in every agent
- Manager-worker coordination
- Debate and ensemble for high-stakes decisions
- MCP-style tool calling (vendor-neutral)
- Cost/quality model routing
- Confidence calibration with longitudinal outcome tracking

### 4.3 The "And Beyond"
- Founder lifetime-value management
- Co-investor and syndicate intelligence graph
- LP intelligence and capital-formation arm
- Sector and thesis evolution tracking (versioned)
- Talent and operator network
- Knowledge productization (book, podcast, Substack pipelines)

---

## 5. Tech Stack

| Layer | Recommended |
|---|---|
| LLMs | Claude Opus/Sonnet/Haiku (tiered routing); OpenAI and open-source via abstraction |
| Agent framework | Anthropic SDK + MCP; LangGraph or AutoGen for orchestration patterns |
| Knowledge graph | Neo4j or graph layer on Postgres |
| Vector store | pgvector (in-Postgres) or Pinecone/Weaviate (managed) |
| Time-series | TimescaleDB on Postgres |
| Workflow orchestration | Temporal (durable, human-checkpoint-friendly) |
| MCP servers | Tavily, Firecrawl, Context7, Crunchbase, Pitchbook, Affinity, custom KG and KPI servers |
| Frontend | React/TypeScript |
| Backend | FastAPI + Postgres + Redis |
| Auth | Auth0 or Clerk (role-based with deal-level conflicts isolation) |
| Secrets | Doppler / 1Password / AWS Secrets Manager (never in config files) |
| Observability | OpenTelemetry + Grafana for agent traces; PostHog for usage analytics |

---

## 6. Build Phasing: From MVP to Platform

### Phase 0 (now to 90 days): MVP
- Pre-call dossier agent
- Industry analyst agent (autoresearch)
- IC pre-read drafter agent
- Knowledge graph foundation (companies, people, deals)
- Partner workbench v0
- Audit log and provenance tracking from day one

### Phase 1 (90–180 days): Diligence Swarm Completion
- Founder researcher, reference orchestrator, customer DD, financial modeler agents
- Devil's-advocate agent
- IC orchestrator and returns modeler
- Conversational chat interface

### Phase 2 (6–12 months): Sourcing Swarm + Portfolio Monitoring
- Sourcing swarm (all six agents)
- Portfolio KPI monitor and board prep agents
- LP reporting agent (basic)
- Conviction calibrator begins to produce signal at ~50 deals

### Phase 3 (12–24 months): Learning Loop + Full Operations
- Pattern library, thesis evolution, backtesting agents
- Full operations swarm
- Cross-pollination, exit scout
- LP portal

### Phase 4 (24+ months): External Productization
- Multi-tenant version for other funds
- Fund-of-funds and emerging manager workflows
- Open MCP servers for the venture ecosystem

---

## 7. Open Strategic Questions

1. Single-tenant (this fund only) vs multi-tenant (sell to other funds) — affects every architectural decision
2. Build-vs-buy for fund admin (Carta integration vs replace)
3. Data residency requirements (driven by LP geography; EU LPs trigger GDPR-grade architecture)
4. AI provider lock-in vs abstraction (affects how MCP and tool calling are designed)
5. Conflicts model for shared deal flow (if multiple partners or co-funds use the same instance, deal-level isolation is non-trivial)

---

## 8. Success Metrics

- **Time-from-deal-intake to IC pre-read**: target 1 week (from baseline 3–4 weeks)
- **Hours-of-partner-time per deal screened**: target 80% reduction at the screening layer
- **Conviction calibration accuracy**: does a 9/10 conviction deal outperform a 6/10 historically? (system should improve this over time)
- **Pass-then-winner rate**: deals we passed that became unicorns (track and learn from)
- **LP NPS**: a working ops swarm should produce better LP reporting than human-driven
- **Vintage-over-vintage TVPI improvement**: attributable to platform-driven decision quality

---

*Document version 1.0 — initial scope draft*

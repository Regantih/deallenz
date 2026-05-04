# DealLens (deallenz)

> A scrollytelling deal-analysis platform for **Marketlogic Investors LLC**.
> Editorial, narrative-driven UI inspired by long-form explanatory journalism.

## What it is

DealLens turns a raw deck or data-room into a publishable, narratively-structured investment memo — a single-column scrollytelling journey through fourteen fixed chapters grouped into five acts.

### The five acts and fourteen chapters

**Act I — Why** (the demand-side truth)
1. The Customer — ICP, willingness-to-pay, JTBD
2. The Problem — quantified pain, status-quo cost, urgency
3. The Solution — wedge, defensible insight, product flow

**Act II — What** (the opportunity)
4. The Company — founding story, thesis, stage, ask
5. The Market — TAM/SAM/SOM, growth, segmentation
6. The Competition — direct, indirect, substitutes, positioning

**Act III — Who** (the operators)
7. The Team — founder cards + 7-axis radar

**Act IV — How** (the engine and the world it runs in)
8. The Traction — ARR, retention, NDR, burn multiple, payback
9. The Moat — data, network, regulatory, brand, switching cost
10. The Macro — rates, inflation, capital flows, sector cycle
11. The Micro — unit economics: CAC, LTV, GM, contribution
12. The Geopolitics — supply chain, sanctions, data residency, tariffs

**Act V — So what** (the call)
13. The Risks — heatmap (market/team/tech/regulatory/financial/exit)
14. The Verdict — composite score + Pass / Track / Invest

Each chapter is hydrated by an agent stack (`gstack`), grounded in evidence (`autoresearch`) with at least one cited claim, explained at depth (`feynman`), and — where applicable — scored (`evaluation`).

## Architecture

```
deallenz/
  apps/web/                  # Vite + React 18 + TS + Tailwind
  packages/gstack/           # modular agent orchestrator
  packages/paperclip/        # ingestion: decks, arXiv, SSRN, market sources
  packages/autoresearch/     # evidence layer with citations
  packages/feynman/          # deep explainers
  packages/evaluation/       # founder/team scoring engine
  functions/                 # callable functions
  docs/                      # ADRs, expectations, decision log
  .github/workflows/         # CI: deploy to Pages
```

### Tech choices

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite + TS |
| Styling | Tailwind with editorial design tokens (warm canvas #f5f1e8, ink #1a1a1a, accent #2f6b4f) |
| Motion | Framer Motion + IntersectionObserver |
| Viz | D3 SVG + Canvas |
| State | Zustand + URL hydration |
| Backend | Firebase (Auth/Firestore/Functions) |
| LLM | Primary + fallback model routing |
| Hosting | GitHub Pages + Firebase |

## Team evaluation (7 axes)

Domain fit · Prior exits · Technical depth · GTM · Grit · Coachability · Equity alignment.
Each 1–5 with cited evidence; composite weighted by stage.

## Unit-economics formulas (locked)

- CAC = S&M spend / new customers acquired
- LTV = ARPU × GM% / churn
- Payback = CAC / (ARPU × GM%)
- Burn Multiple = Net Burn / Net New ARR
- NDR = (Starting ARR + Expansion − Churn − Contraction) / Starting ARR

## Macro / Geo data sources

FRED (rates), World Bank (GDP), OFAC (sanctions), BIS (capital flows), USTR (tariffs).

## Documentation

- `docs/EXPECTATIONS.md` — Application/Technical/Financial/Operational charter
- `docs/DECISIONS.md` — Live decision log
- `docs/adr/` — Architecture Decision Records

## Live

- v1: https://regantih.github.io/deallens/
- v2: https://regantih.github.io/deallenz/ (after PR2)

## License

MIT © 2026 Marketlogic Investors LLC

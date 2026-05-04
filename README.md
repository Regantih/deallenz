# DealLens (deallenz)

> A scrollytelling deal-analysis platform for **Marketlogic Investors LLC**.
> Editorial, narrative-driven UI inspired by long-form explanatory journalism.

## What it is

DealLens turns a raw deck or data-room into a publishable, narratively-structured investment memo — a single-column scrollytelling journey through seven fixed chapters:

**Company → Market → Team → Traction → Moat → Risks → Verdict**

Each chapter is hydrated by an agent stack (`gstack`), grounded in evidence (`autoresearch`), explained at depth (`feynman`), and scored on a multi-axis founder rubric (`evaluation`).

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

## Chapters

1. The Company — thesis pin
2. The Market — TAM/SAM/SOM bubbles
3. The Team — founder cards + 7-axis radar
4. The Traction — ARR/retention/burn chart
5. The Moat — layered defensibility
6. The Risks — scroll-revealed heatmap
7. The Verdict — composite score + Pass/Track/Invest

## Team evaluation (7 axes)

Domain fit · Prior exits · Technical depth · GTM · Grit · Coachability · Equity alignment.
Each 1–5 with cited evidence; composite weighted by stage.

## Documentation

- `docs/EXPECTATIONS.md` — Application/Technical/Financial/Operational charter
- `docs/DECISIONS.md` — Live decision log
- `docs/adr/` — Architecture Decision Records

## Live

- v1: https://regantih.github.io/deallens/
- v2: https://regantih.github.io/deallenz/ (after PR2)

## License

MIT © 2026 Marketlogic Investors LLC

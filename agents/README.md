# Agents

Four modular agents enrich every submitted deal record into a 14-chapter memo.

| Agent | Inspired by | Job | Reads | Writes |
|---|---|---|---|---|
| **ingest-agent** | paperclip | Parse deck/data-room, extract claims, normalize ICP/JTBD/WTP | deck PDF, dataroom links | `customer`, `solution`, `company`, `traction` blocks |
| **research-agent** | autoresearch | Multi-hop web research with cited evidence | thesis, sector, geo | `problem`, `market` (TAM/SAM/SOM), `comp`, `moat`, `macro`, `geo`, `risks` |
| **team-agent** | gstack | Score founder-market fit, prior exits, domain depth | LinkedIn URLs | `team`, `verdict` |
| **unit-econ-agent** | feynman | Compute CAC, LTV, payback, burn multiple, Rule of 40 | ARR, MoM, NRR, model | `micro` |

## Pipeline

```
intake → enriching → memo-ready → ic-review → decision
```

1. `submit.html` produces `deals/{id}.json` (status=`intake`).
2. Enrichment job fans out to the four agents in parallel; each PRs back patches to the deal JSON.
3. When all four complete, status flips to `memo-ready` and `deal.html?id=...` renders the full memo.
4. IC review records verdict; entry appended to `docs/DECISIONS.md`.

## Status

PR3 ships **stubs and the contract** — the four runners (`ingest.js`, `research.js`, `team.js`, `unit_econ.js`) and a Cloudflare Worker / GitHub Action runner are PR4.

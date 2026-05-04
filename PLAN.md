# DealLens — Build Plan

## Current Status
- [x] Intake tab: chat, file upload, link add, text paste, sample deal loader
- [x] Dossier tab: 7-section pre-call research dossier with sticky pills
- [x] Pipeline tab: 6 enrichment agents with live logs and evidence
- [x] Call Prep tab: question bank, signal capture, decision framework
- [x] IC Memo tab: scrollytelling investment memo with chapters
- [x] Logs tab: observability trace with filters and JSON export
- [x] Upload fix: click handler on dropZone (commit 33126cc)

## Known Issues
- None currently open

## Completed Fixes
- logCount -> logBadge reference error (commit cc5e20e)
- dropZone click handler for file upload (commit 33126cc)

## Architecture
- Single-file HTML app (app.html) with inline CSS/JS
- Branch: pr4/chat-and-rich-memo
- Live: https://regantih.github.io/deallenz/app.html
- Preview: raw.githack.com/Regantih/deallenz/{commit}/app.html

## Next Steps
- [ ] Connect real LLM API for intake chat parsing
- [ ] Real web scraping for enrichment agents
- [ ] Persistent storage (localStorage or backend)
- [ ] Multi-deal portfolio view
- [ ] Deal sourcing pipeline integration
- [ ] Ops/portfolio monitoring dashboard

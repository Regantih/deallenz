# Documentation Discipline — Standing Rule

> **Memory store key:** `DOCS_DISCIPLINE`  
> **Scope:** all sessions on Regantih/deallenz  
> **Authority:** user-defined rule (2026-05-10)  
> **Status:** LOCKED — supersedes any prior practice

---

## Rule

After every meaningful change to the DealLens codebase, the following documents **must** be updated in the same commit or PR. "Meaningful change" includes any new feature, new file, new route, new env var, new migration, new mock, or removal of any of the above.

---

## Required updates per change

### 1. `/docs/BUILD_STATUS.md` (create if missing)

Maintain four mandatory sections:

| Section | What goes here |
|---|---|
| **Built (working)** | Checkbox list of every shipped capability with `[PR#N]` or `[main]` tag |
| **In progress** | Current branch, PR number, owner, blocker |
| **Pending / Not started** | Prioritised backlog — ordered by business impact |
| **Known gaps / mocked** | Every mock or stub with the credential/action needed to make it real |

Also include:
- **Environment variables reference** — every required env var with status (SET / NOT SET).
- **Last updated** timestamp + commit SHA at the top of the file.

### 2. `README.md`

- Keep **Quick start**, **Environment variables**, and **Architecture overview** sections current.
- Link to `docs/BUILD_STATUS.md` from the top of README.
- Never leave stale instructions (e.g., a migration step for a table that no longer exists).

### 3. `ARCHITECTURE.md`

- Update whenever a module, route, or data flow changes.
- Sections that must stay current: service connectivity matrix, LLM tier map, DB schema diagram, API route table, mock guard policy.

### 4. `.env.example`

- Every required env var must appear with a one-line comment explaining where to get it.
- Vars not yet set must appear commented-out with a note like `# NOT YET SET — provide to unlock <feature>`.
- Never remove a var that is still used in code.

### 5. Memory store `deallenz-architecture`

> Implemented as files in `docs/` on the active branch.

| Key | File | Contents |
|---|---|---|
| `BUILD_PLAN.md` | `PLAN.md` (repo root) | Phase roadmap — update when phases complete or priorities shift |
| `MERGE_READINESS.md` | `docs/MERGE_READINESS.md` | Per-PR status, conflict graph, gap analysis — update after each PR open/merge/close |
| `PR{N}_STATUS` | `docs/PR{N}_STATUS.md` | Real-vs-mocked breakdown — create when PR opens, update when it changes |
| `DOCS_DISCIPLINE` | `docs/DOCS_DISCIPLINE.md` | This file |
| `BUILD_STATUS` | `docs/BUILD_STATUS.md` | Live build status (see §1 above) |

### 6. Each PR description

Every PR opened on this repo must include these two sections:

```markdown
## What's built in this PR
<bullet list of every capability added, wired, or changed>

## What's still pending after this PR
<bullet list of what remains mocked, stubbed, or not started>
```

No exceptions — a PR without these two sections is incomplete.

---

## Enforcement

- The deallenz-builder agent checks this file at the start of every session before planning any work.
- If any of the six items above are found to be out of date relative to the current code, the agent must update them before opening a new PR for feature work.
- Documentation drift is treated as a bug, not a nicety.

---

## Applied retroactively

This rule was applied retroactively on 2026-05-10:
- `docs/BUILD_STATUS.md` created reflecting PRs #1–#7 and `main`.
- `docs/MERGE_READINESS.md` created during PR #7 review.
- `docs/PR7_STATUS.md` created during PR #7 work.
- `ARCHITECTURE.md` created during PR #7 work.
- All future PRs must follow the §6 PR-description requirement from opening.

Gaps that were identified as out of compliance at time of writing:
- `README.md` does not yet link to `docs/BUILD_STATUS.md` (fix in next PR touching README).
- `PLAN.md` (root) is outdated relative to current phase — reflects Phase 0 tasks completed up to PR #3 only; does not reflect Next.js work in PRs #4–#7.
- `docs/DECISIONS.md` stops at D-033; decisions D-034+ (PR #7 choices: AnthropicModelRouter, SupabaseJobsQueue, claim_next_job RPC, DI queue pattern) have not been logged yet.

# AGENTS.md

This file is the **single source of truth** for how we work in this repository.
Every AI coding tool reads it — Claude Code, Cursor, Copilot, and Codex. The
other instruction files are thin adapters that delegate here; **never duplicate
this content.**

This is an Nx integrated monorepo (`apps/` + `libs/`) built *with* AI coding
agents: the human decides what to build and reviews; the agent writes the code.

## Working agreement (non-negotiable)

1. **Plan first, then wait.** Before writing files, propose an ordered task list
   and the target file tree, then STOP for approval. Never scaffold or write
   feature code before the plan is approved.
2. **One task, one commit.** Small, reviewable commits with descriptive messages
   (conventional commits).
3. **Checkpoint each phase.** Use the `workshop-builder` skill: verify the phase
   is green, then snapshot it. Never checkpoint a broken (red) state.
4. **Show, then proceed.** After each phase, summarize what changed and pause.
5. **Enforcement lives in tests / lint / CI, not prose.** If a rule must always
   hold, encode it — Nx module boundaries, lint, tests, hooks — not a sentence in
   a markdown file.
6. **Honor the decisions of record.** ADRs in `docs/adr/` are binding. If a
   proposal contradicts an accepted ADR, follow the ADR or write a new one that
   supersedes it — don't silently re-litigate.
7. **Don't invent facts** about tool, framework, or Nx behavior. If unsure, say
   so.

## Commands

```
nx serve <app>                   # run an app in dev
nx run-many -t test              # all unit tests
nx run-many -t lint              # all lint (ESLint, --max-warnings 0, incl. module boundaries)
nx run-many -t build             # all builds
nx affected -t test,lint,build   # CI — only what changed
nx graph                         # inspect the project graph
```

Runtime: **Node 20 LTS**. Strict TypeScript, no `any`.

## Quality gates

- **Right?** — tests, lint (incl. `@nx/enforce-module-boundaries`), and CI answer
  whether code is correct and within the architecture. Objective; must be green
  before any checkpoint.
- **Allowed?** — the ADRs and this file answer whether a choice is permitted.

## Knowledge center (where decisions live)

- **`AGENTS.md`** (this file) — the constitution. Principles + commands. Loaded
  every turn.
- **`docs/adr/`** — Architecture Decision Records (MADR / Nygard: Status,
  Context, Decision, Consequences). *Why* we chose what we chose. Numbered,
  immutable, append-only; superseding is explicit. Binding; read on demand.
- **`docs/decisions.md`** — index / front door to the ADRs.
- **`docs/`** — product docs (PRD, HLD, specs) as the project takes shape.
- Working notes (agent auto-memory) are local and unsynced. When they capture a
  real decision, **promote it into an ADR or this file.**

## Tooling (the four primitives)

This repo is tool-agnostic. `AGENTS.md` is the source of truth; each tool gets a
thin adapter that delegates here (`CLAUDE.md`, `.github/copilot-instructions.md`,
`.cursor/rules/project.mdc`; Codex reads this file natively). We rely on four
primitives:

- **Instruction file** — always-loaded ambient context (this file).
- **Scoped rules** — context that switches on by file glob / on request.
- **Skills** — reusable procedures loaded on demand (`.claude/skills/`).
- **Subagents** — specialists with their own context window (`.claude/agents/`).

Adapters delegate; they never copy.

## Do not

- Write feature code outside an approved plan.
- Duplicate instruction content across `AGENTS.md` and its adapters.
- Break the module boundaries enforced in lint.
- Proceed past a phase without showing changes and pausing.
- Checkpoint a red state.

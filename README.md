# Prompt Versioning Service

> Workshop scaffold for **"From Idea to Production with AI Only"** — an 8-hour
> masterclass on taking a project from idea to production using AI coding agents
> only: the human decides what to build and reviews; the agent writes the code.

This repository is the teaching artifact for the masterclass. It is an **Nx
integrated monorepo** that attendees grow, session by session, into a working
**Prompt Versioning Service** — a service that versions prompts the way git
versions code.

> **Status:** Phase 1 — dev-ready scaffold. Skeletons + enforced architecture
> only. **No feature code yet.**

## What we're building (MVP)

- **Create a prompt** — a logical id + name.
- **Create a version** — immutable, content-hashed; stores template text,
  variables, and params (model, temperature, tags).
- **Diff two versions** — API + UI (split / inline).
- **Label / tag versions** — e.g. `dev`, `prod`.
- **Rollback** — relabel `prod` to a previous version, no redeploy.

Domain logic (versioning, hashing, diffing) lives in a **pure domain lib**;
persistence lives behind a **repository interface** in a data-access lib, so the
storage engine is swappable and the domain never imports it.

## Workspace layout

```
apps/
  api/        NestJS API            (@nx/nest)   — type:app,        scope:api
  api-e2e/    API e2e tests
  web/        React + Vite web app  (@nx/react)  — type:app,        scope:web
  web-e2e/    Web e2e tests         (Playwright)
libs/
  prompts/
    domain/       pure TS: entities + version/diff logic  — type:domain,      scope:prompts
    data-access/  repository interface + storage impl      — type:data-access, scope:prompts
  shared/
    types/        DTOs shared between api and web           — type:types,       scope:shared
  web/
    ui/           presentational React components           — type:ui,          scope:web
```

Import paths use the `@pvs` scope: `@pvs/prompts-domain`,
`@pvs/prompts-data-access`, `@pvs/shared-types`, `@pvs/web-ui`.

## Enforced architecture

The layered architecture isn't just documented — it is enforced by
`@nx/enforce-module-boundaries`, so lint fails if a boundary is crossed:

- `domain` may import **only** `shared/types` — it stays pure and can never reach
  into storage.
- `data-access` may import `domain` + `types`.
- `web` may import only `web` libs + `shared` — it can never import server
  internals.

## Requirements for attendees

You'll need:

- **Node.js 20 LTS** (`node -v` → v20.x) — npm ships with it.
- **Git** and a **GitHub account**.
- An **AI coding agent** with an active account/subscription — pick one:
  **Claude Code** (the live session standardizes on this), **Cursor**,
  **VS Code + GitHub Copilot**, or **Codex**.
- A **code editor** (VS Code or a JetBrains IDE).
- **OS:** macOS, Windows, or Linux — all supported (storage runs in-memory, so
  there's nothing native to compile).

**Verify your setup before the workshop** — clone the repo and install; if this
finishes cleanly, you're ready:

```bash
git clone https://github.com/danduh/wad-workshop-prompt-ver.git
cd wad-workshop-prompt-ver
npm install
npx nx graph   # optional — opens the project graph in your browser
```

## Getting started

Requires **Node 20 LTS**.

```bash
npm install
```

Common tasks:

```bash
npx nx serve api           # run the API
npx nx serve web           # run the web app
npx nx run-many -t lint    # lint everything
npx nx run-many -t test    # run all tests
npx nx run-many -t build   # build everything
npx nx graph               # explore the project graph
```

CI uses `npx nx affected -t lint,test,build`.

## Session map

- **Session 1** — empty folder → dev-ready Nx scaffold *(this checkpoint)*.
- **Session 2** — idea → PRD → HLD/ADR → plan → tasks.
- **Sessions 3–4** — domain + data-access libs, then API endpoints; then
  diff / labels / rollback + React UI.
- **Session 5** — tests & hardening.
- **Session 6** — ship: per-app Docker + GitHub Actions driven by `nx affected`.

The instruction layer (`AGENTS.md` + thin per-tool adapters), the agents, the
skills, and the ADR knowledge center are added in the next phases.

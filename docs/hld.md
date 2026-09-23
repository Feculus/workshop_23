# High-Level Design: Prompt Versioning Service

- **Status:** Reflects the current implementation (idea → build; no separate PRD exists yet — this HLD documents the system as built and doubles as the requirements record).
- **Date:** 2026-09-23

## 1. Purpose

Give teams a way to manage LLM prompts as versioned, immutable artifacts instead of
mutable strings scattered through application code. A prompt is created once under a
unique key; every edit produces a new, permanent version; and callers fetch either an
explicit version or whichever version is currently tagged **production**, by API.

## 2. Goals / Non-Goals

**Goals**
- Create a prompt under a unique `prompt_key`.
- Edit a prompt by creating a new version — never mutate an existing version.
- Tag any existing version as the production version for its prompt.
- Retrieve a version by `prompt_key` + explicit version number, or by `prompt_key` alone
  (defaults to production).
- Guarantee immutability: once written, a version's content can never change.

**Non-Goals (not built, flagged for later)**
- AuthN/AuthZ on the API (currently open).
- A management UI (`apps/web`) for browsing/editing prompts.
- Soft-delete / archival of prompts or versions.
- Multi-environment tags beyond a single "production" pointer (e.g. staging, canary).
- Rollback history / audit log of who changed the production pointer and when.

## 3. System Context

```
                 ┌──────────────────────────┐
 Caller (LLM app,│                          │
 script, CI job) │      apps/api (NestJS)   │
        ─────────▶  /api/prompts/*          │
                 │                          │
                 └────────────┬─────────────┘
                              │ Drizzle (pg Pool)
                              ▼
                 ┌──────────────────────────┐
                 │   Neon Postgres           │
                 │   prompts, prompt_versions│
                 └──────────────────────────┘
```

The service is a single NestJS HTTP API backed by one Neon Postgres database. There is
no caching layer, queue, or async processing — every request is a direct, synchronous
read/write against Postgres.

## 4. Module Layout (Nx)

Follows the repo's existing domain/data-access/feature layering and `scope:` module
boundaries (`AGENTS.md`, `eslint.config.mjs`).

| Project | Path | Responsibility |
|---|---|---|
| `prompts-domain` | `libs/prompts/domain` | Pure types (`Prompt`, `PromptVersion`, `PromptVersionSelector`) and domain errors (`PromptNotFoundError`, `PromptVersionNotFoundError`, `DuplicatePromptKeyError`). No framework or DB dependency. |
| `prompts-data-access` | `libs/prompts/data-access` | Drizzle schema mirroring the live Neon tables, a shared `pg` Pool, and `PromptsRepository` — the only place that issues SQL. |
| `api` | `apps/api/src/app/prompts` | DTOs (`class-validator`), `PromptsController`, `PromptsService`, `PromptsModule`. Translates domain errors into HTTP status codes. |

`scope:prompts` projects (`prompts-domain`, `prompts-data-access`) may depend on
`scope:prompts` (self) and `scope:shared`. `apps/api` is tagged `scope:api` and depends
on both `prompts-domain` and `prompts-data-access` per the existing boundary rules.

## 5. Data Model

```
prompts
  id                      bigserial PK
  prompt_key               text UNIQUE NOT NULL     -- external identifier
  name                      text NOT NULL
  description               text NULL
  production_version_id    bigint NULL  FK -> prompt_versions.id
  created_at / updated_at  timestamptz

prompt_versions            -- append-only, never UPDATEd/DELETEd by app code
  id                      bigserial PK
  prompt_id                bigint NOT NULL FK -> prompts.id
  version                  integer NOT NULL
  content                  text NOT NULL
  metadata                 jsonb NULL
  created_at               timestamptz
  UNIQUE (prompt_id, version)
```

**Immutability guarantee:** the repository layer (`PromptsRepository`) never issues an
`UPDATE` or `DELETE` against `prompt_versions`. The only mutable field in the entire
schema is `prompts.production_version_id` — a pointer, not content. This is enforced by
convention in the repository today (documented in code comments); a stronger guarantee
(e.g. a `BEFORE UPDATE/DELETE` trigger that raises on `prompt_versions`) is a candidate
follow-up if this needs to be enforced at the database level rather than the application
level.

Schema changes are applied directly against Neon via the Neon MCP (not `drizzle-kit`);
`schema.ts` is kept in sync by hand and is documentation of, not the source of truth for,
the live schema.

## 6. API Surface

All routes are under the global `api` prefix, then `/prompts`.

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/prompts` | Create a prompt + version 1. Version 1 is automatically tagged production. `409` on duplicate `prompt_key`. |
| `POST` | `/prompts/:promptKey/versions` | Create a new immutable version (the "edit" operation). Does **not** move the production pointer. |
| `GET` | `/prompts/:promptKey/versions` | List all versions for a prompt, newest first. |
| `GET` | `/prompts/:promptKey/versions/:version` | Fetch one explicit version. `404` if the prompt or version doesn't exist. |
| `GET` | `/prompts/:promptKey?version=N` | Fetch a version by key; omit `version` (or pass `production`) to get whatever is currently tagged production. |
| `POST` | `/prompts/:promptKey/production` | Repoint the production pointer at an existing version. `404` if that version doesn't exist. |

Validation: a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` in
`main.ts` rejects unknown/malformed request bodies before they reach a controller.

## 7. Key Flows

**Create**
1. `POST /prompts` with `{ promptKey, name, content, description?, metadata? }`.
2. Repository inserts a `prompts` row and a `prompt_versions` row (version 1) in one
   transaction, then sets `production_version_id` to the new version's id.
3. Duplicate `prompt_key` → unique constraint violation → mapped to `409 Conflict`.

**Edit (new version)**
1. `POST /prompts/:promptKey/versions` with `{ content, metadata? }`.
2. Repository looks up the prompt, computes `max(version) + 1` for that `prompt_id`, and
   inserts a new `prompt_versions` row. The `prompts.production_version_id` pointer is
   left untouched — new versions are not live until explicitly promoted.

**Promote to production**
1. `POST /prompts/:promptKey/production` with `{ version }`.
2. Repository verifies the version exists for that prompt, then updates
   `prompts.production_version_id` to point at it. No `prompt_versions` row changes.

**Read**
1. `GET /prompts/:promptKey[?version=N]`.
2. If `version` is omitted, the repository joins `prompts.production_version_id` to
   `prompt_versions` and returns that row. If provided, it fetches the exact
   `(prompt_id, version)` row directly.

## 8. Error Handling

Domain errors thrown by the repository/service are mapped to HTTP responses at the
controller/service boundary:

| Domain error | HTTP status |
|---|---|
| `DuplicatePromptKeyError` | 409 Conflict |
| `PromptNotFoundError` | 404 Not Found |
| `PromptVersionNotFoundError` | 404 Not Found |
| DTO validation failure | 400 Bad Request |

## 9. Cross-Cutting Concerns

- **Concurrency:** version numbering (`max(version) + 1`) and production promotion run
  inside a DB transaction to avoid two concurrent edits racing to the same version
  number. High-contention environments could still benefit from a `SERIALIZABLE`
  isolation level or a DB-side sequence per prompt if write volume grows.
- **AuthN/AuthZ:** none today — the API is unauthenticated. This is the most significant
  gap before any production use beyond an internal trusted network; recommend deciding
  on an auth story (API keys per consumer, or the repo's Better Auth stack if this needs
  end-user-facing management) in a follow-up ADR.
- **Observability:** relies on default NestJS logging; no structured audit trail of who
  created a version or promoted production. Worth an ADR if compliance/audit needs
  surface.
- **Performance:** all reads are indexed (`prompt_key` unique, `prompt_versions.prompt_id`
  indexed) point-lookups; no caching layer exists or is currently needed at expected
  scale.

## 10. Open Questions / Follow-Ups

1. Should immutability be enforced at the database level (trigger rejecting
   `UPDATE`/`DELETE` on `prompt_versions`) rather than only by application convention?
2. Do we need multiple environment tags (`staging`, `canary`) instead of a single
   `production` pointer?
3. Is an audit trail (who created/promoted, when) required, and if so should it live in
   this schema or a separate events table?
4. What authentication model fits the consumers of this API (service-to-service API
   keys vs. end-user auth via the existing Better Auth/Neon stack)?
5. Is a management UI in `apps/web` needed, or is this API-only by design?

Each "yes" above should be captured as its own ADR under `docs/adr/` before
implementation, per `AGENTS.md`.

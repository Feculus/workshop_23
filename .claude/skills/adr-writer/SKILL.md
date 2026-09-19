---
name: adr-writer
description: Author or supersede an Architecture Decision Record in docs/adr/ using the MADR/Nygard format, then update the decisions index. Use when a decision with lasting consequences needs to be recorded.
---

# adr-writer

Records a decision as a numbered, immutable ADR.

## When to use

When a choice with lasting consequences is made — architecture, tooling, or
process. If a proposal contradicts an accepted ADR, either honor it or write a
new ADR that supersedes it; never silently re-litigate.

## Procedure

1. Copy `docs/adr/template.md` to `docs/adr/NNNN-short-title.md`, using the next
   zero-padded number (`0001`, `0002`, …).
2. Fill in **Status** (Proposed | Accepted | Superseded by ADR-XXXX), **Date**,
   **Context**, **Decision**, **Consequences**. Keep it tight and factual —
   state the forces, then the choice, then what it commits us to.
3. To reverse a past decision, add a *new* ADR and set the old one's Status to
   "Superseded by ADR-NNNN". ADRs are append-only — don't rewrite an accepted one.
4. Add a row to `docs/decisions.md` (number, title, status, date).
5. Commit as its own task: `docs(adr): NNNN <title>`.

## Rules

- One decision per ADR. Numbered, immutable, append-only.
- Decisions of record are binding (see `AGENTS.md`).

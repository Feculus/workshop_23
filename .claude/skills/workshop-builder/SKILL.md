---
name: workshop-builder
description: Verify a phase is green, then snapshot it as the next stacked checkpoint branch. Use when finishing a workshop phase/step and cutting its checkpoint. Never checkpoints a red or dirty state.
---

# workshop-builder

Snapshots a completed phase as a checkpoint others can fast-forward to.

## Branch model

See [`references/checkpoints.md`](references/checkpoints.md) for the full model.
In short: `main` is **step 0**; steps form a **linear stack** — each step branch
is cut from the **tip of the previous step**, and **nothing ever merges into
`main`**.

## Procedure

1. Ensure every task in the phase is committed (one task, one commit) and the
   working tree is clean.
2. From the repo root, run the checkpoint script with the next step's branch name:
   ```sh
   .claude/skills/workshop-builder/scripts/checkpoint.sh <next-step-branch>
   ```
   It refuses a dirty tree or a red state (`lint · test · build`), then cuts
   `<next-step-branch>` from the current tip.
3. Confirm the new branch and summarize what the checkpoint contains.

## Rules

- **Never checkpoint a red or dirty state.** The script enforces this — do not
  bypass it.
- Name steps `NN-topic` (e.g. `03-product-spec`).
- Do not merge any step into `main`.

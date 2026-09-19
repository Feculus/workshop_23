# Checkpoint & branch model

How workshop checkpoints are structured so attendees can fast-forward from one
step to the next.

## The linear stack

- **`main` is step 0** — the dev-ready scaffold.
- Every subsequent step is a branch cut from the **tip of the previous step**,
  never from a sibling.
- **Nothing ever merges into `main`.** The history is a straight stack of
  checkpoints, each building on the last:

```
main (step 0)
 └─ 02-context   (step 1)   ← cut off main
     └─ 03-...   (step 2)   ← cut off step 1's tip
         └─ 04-... (step 3) ← cut off step 2's tip
```

## Rules (enforced by checkpoint.sh)

- **Clean tree** — every task committed before a checkpoint (one task, one commit).
- **Green only** — `nx run-many -t lint test build` must pass. Never checkpoint a
  red state.
- **Cut from the current tip** — the new step branches off wherever you are.

## Naming

`NN-topic`, zero-padded and ordered — e.g. `02-context`, `03-product-spec`,
`04-domain`. The number is the step; the topic is what the step adds.

## Usage

From the repo root, after committing the phase:

```sh
.claude/skills/workshop-builder/scripts/checkpoint.sh 03-product-spec
```

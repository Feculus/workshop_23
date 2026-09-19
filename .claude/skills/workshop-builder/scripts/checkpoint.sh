#!/usr/bin/env bash
# checkpoint.sh — verify the current phase is green, then snapshot it as the next
# stacked step branch. See ../references/checkpoints.md for the branch model.
#
# Usage: checkpoint.sh <next-step-branch>
#   e.g. checkpoint.sh 03-product-spec
#
# Rules enforced here (not in prose):
#   - refuse a dirty working tree (a checkpoint must be a committed state)
#   - refuse a red state (lint + test + build must pass)
#   - cut the new branch from the CURRENT tip (linear stack); never touch main
set -euo pipefail

next="${1:-}"
if [[ -z "$next" ]]; then
  echo "usage: $(basename "$0") <next-step-branch>" >&2
  exit 2
fi

# 1. Clean tree required.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "✗ working tree is dirty — commit or stash before checkpointing." >&2
  exit 1
fi

current="$(git rev-parse --abbrev-ref HEAD)"

# 2. Never checkpoint a red state.
echo "▶ verifying green on '${current}' (lint · test · build)…"
npx nx run-many -t lint test build

# 3. Snapshot: cut the next step from the current tip. Nothing merges into main.
if git show-ref --verify --quiet "refs/heads/${next}"; then
  echo "✗ branch '${next}' already exists." >&2
  exit 1
fi
git checkout -b "${next}"
echo "✓ green. checkpointed '${current}' → new step branch '${next}' (off its tip)."

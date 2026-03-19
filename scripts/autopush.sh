#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

# Make sure we don't accidentally commit env files
if git status --porcelain | grep -E -q '(^| )\.env'; then
  echo "Refusing to commit .env changes. Remove them or stash them first."
  exit 1
fi

git add -A

# No staged changes -> nothing to do
git diff --cached --quiet && exit 0

msg="wip: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$msg"
git push


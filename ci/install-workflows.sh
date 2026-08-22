#!/usr/bin/env bash
# Copies the CI workflows into .github/workflows and pushes them.
# Needed because the Arena GitHub App is not allowed to write workflow files.
set -euo pipefail

branch="$(git rev-parse --abbrev-ref HEAD)"
mkdir -p .github/workflows
cp ci/workflows/deploy.yml ci/workflows/android.yml .github/workflows/

git add .github/workflows
if git diff --cached --quiet; then
  echo "✓ workflows already up to date"
  exit 0
fi

git commit -m "ci: add Vercel deploy and Android APK workflows"
git push origin "$branch"
echo "✅ workflows installed on $branch"

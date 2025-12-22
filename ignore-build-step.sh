#!/bin/bash

# Vercel Ignore Build Step Script
# This script determines whether Vercel should build this deployment
# Exit 0 = Build, Exit 1 = Don't build

echo "🔍 Checking if build should proceed..."
echo "Branch: $VERCEL_GIT_COMMIT_REF"

# Never build data-archive branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "data-archive" ]]; then
  echo "❌ Skipping build for data-archive branch (archive-only, not for deployment)"
  exit 1
fi

# Always build master branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "master" ]]; then
  echo "✅ Building master branch"
  exit 0
fi

# For any other branch, skip
echo "⚠️  Skipping build for branch: $VERCEL_GIT_COMMIT_REF"
exit 1

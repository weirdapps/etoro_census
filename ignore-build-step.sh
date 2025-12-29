#!/bin/bash

# Vercel Ignore Build Step Script
# This script determines whether Vercel should build this deployment
# IMPORTANT: Vercel's exit code logic is:
# Exit 1 = Build (proceed), Exit 0 = Don't build (ignore)

echo "🔍 Checking if build should proceed..."
echo "Branch: $VERCEL_GIT_COMMIT_REF"
echo "Environment: $VERCEL_ENV"

# Never build data-archive branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "data-archive" ]]; then
  echo "❌ Skipping data-archive branch (archive-only, not for deployment)"
  exit 0
fi

# ALWAYS build master branch (production deployments)
if [[ "$VERCEL_GIT_COMMIT_REF" == "master" ]]; then
  echo "✅ Building master branch for production"
  exit 1
fi

# Skip ALL other branches (preview deployments)
echo "❌ Skipping non-master branch: $VERCEL_GIT_COMMIT_REF"
exit 0

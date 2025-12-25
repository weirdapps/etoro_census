#!/bin/bash

# Vercel Ignore Build Step Script
# This script determines whether Vercel should build this deployment
# Exit 0 = Build, Exit 1 = Don't build

echo "🔍 Checking if build should proceed..."
echo "Branch: $VERCEL_GIT_COMMIT_REF"
echo "Environment: $VERCEL_ENV"

# ONLY build master branch in production
if [[ "$VERCEL_GIT_COMMIT_REF" == "master" && "$VERCEL_ENV" == "production" ]]; then
  echo "✅ Building master branch (production)"
  exit 0
fi

# Skip ALL preview deployments
if [[ "$VERCEL_ENV" == "preview" ]]; then
  echo "❌ Skipping preview deployment (production-only mode)"
  exit 1
fi

# Never build data-archive branch
if [[ "$VERCEL_GIT_COMMIT_REF" == "data-archive" ]]; then
  echo "❌ Skipping data-archive branch (archive-only, not for deployment)"
  exit 1
fi

# Skip all other scenarios
echo "⚠️  Skipping build (branch: $VERCEL_GIT_COMMIT_REF, env: $VERCEL_ENV)"
exit 1

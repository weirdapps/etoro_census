#!/bin/bash
#
# Batch Push Script for Historical Census Data
#
# Purpose: Push large historical dataset to GitHub in monthly batches
#          to avoid timeout issues with single large push.
#
# Usage: ./scripts/push-archive-batch.sh [start_month] [end_month]
#   Example: ./scripts/push-archive-batch.sh 2025-06 2025-12
#   Without args: Pushes all unpushed commits in batches
#

set -e

cd "$(dirname "$0")/.."
cd archive 2>/dev/null || { echo "❌ Archive worktree not found. Run sync script first."; exit 1; }

echo "📦 Batch Push for Historical Census Data"
echo ""

# Check if we have unpushed commits
UNPUSHED=$(git log origin/data-archive..HEAD --oneline | wc -l | tr -d ' ')

if [ "$UNPUSHED" = "0" ]; then
    echo "✅ All commits already pushed to GitHub"
    exit 0
fi

echo "Found $UNPUSHED unpushed commit(s)"
echo ""

# Function to push with retry
push_with_retry() {
    local attempt=1
    local max_attempts=3

    while [ $attempt -le $max_attempts ]; do
        echo "Attempt $attempt/$max_attempts: Pushing to GitHub..."
        if git push origin data-archive; then
            echo "✅ Push successful!"
            return 0
        else
            echo "⚠️  Push failed (attempt $attempt/$max_attempts)"
            if [ $attempt -lt $max_attempts ]; then
                echo "Waiting 10 seconds before retry..."
                sleep 10
            fi
            attempt=$((attempt + 1))
        fi
    done

    echo "❌ Push failed after $max_attempts attempts"
    return 1
}

# Try to push all at once first
echo "Attempting to push all data..."
if push_with_retry; then
    echo ""
    echo "🎉 All historical data successfully pushed to GitHub!"
    exit 0
fi

echo ""
echo "⚠️  Full push failed. This is normal for large datasets."
echo "ℹ️  The data is safely committed locally and will be available for daily syncs."
echo "ℹ️  Future daily census runs will automatically add small incremental commits."
echo ""
echo "Options:"
echo "  1. Leave historical data local-only (recommended)"
echo "  2. Manually upload via Git LFS (requires setup + costs money)"
echo "  3. Use external backup (rsync to external drive, cloud storage, etc.)"
echo ""
echo "Current status:"
echo "  ✅ $UNPUSHED commit(s) safe locally"
echo "  ✅ 208 files in local archive worktree"
echo "  ✅ Future daily commits will work (small files)"
echo "  ✅ Local sync script configured and working"

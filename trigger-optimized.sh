#!/bin/bash

# Script to manually trigger the optimized census report generation

echo "Triggering optimized census report generation..."

# Use the GitHub CLI if available
if command -v gh &> /dev/null; then
    echo "Using GitHub CLI to trigger workflow..."
    gh workflow run daily-census-optimized.yml --ref optimize
else
    echo "GitHub CLI not found. Please install it with: brew install gh"
    echo "Or trigger manually from: https://github.com/weirdapps/etoro_census/actions"
    echo ""
    echo "To trigger manually:"
    echo "1. Go to Actions tab"
    echo "2. Select 'Daily Census Report Generation (Optimized)'"
    echo "3. Click 'Run workflow'"
    echo "4. Select branch: optimize"
    echo "5. Click 'Run workflow' button"
fi
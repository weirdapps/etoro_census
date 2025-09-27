#!/bin/bash

# CRITICAL SCRIPT: Verifies that all historical reports and data are preserved locally
# This script should be run periodically to ensure no data loss

echo "================================================"
echo "LOCAL HISTORY VERIFICATION SCRIPT"
echo "================================================"
echo ""

# Count local reports
REPORT_COUNT=$(ls -1 public/reports/etoro-census-*.html 2>/dev/null | wc -l)
echo "✅ Local HTML Reports: $REPORT_COUNT files"

# Count local JSON data
DATA_COUNT=$(ls -1 public/data/etoro-data-*.json 2>/dev/null | wc -l)
echo "✅ Local JSON Data: $DATA_COUNT files"

# Show oldest and newest reports
echo ""
echo "Report History Range:"
OLDEST_REPORT=$(ls -1 public/reports/etoro-census-*.html 2>/dev/null | head -n 1)
NEWEST_REPORT=$(ls -1 public/reports/etoro-census-*.html 2>/dev/null | tail -n 1)
echo "  Oldest: $OLDEST_REPORT"
echo "  Newest: $NEWEST_REPORT"

echo ""
echo "Data History Range:"
OLDEST_DATA=$(ls -1 public/data/etoro-data-*.json 2>/dev/null | head -n 1)
NEWEST_DATA=$(ls -1 public/data/etoro-data-*.json 2>/dev/null | tail -n 1)
echo "  Oldest: $OLDEST_DATA"
echo "  Newest: $NEWEST_DATA"

# Verify git is tracking these files
echo ""
echo "Git Tracking Status:"
TRACKED_REPORTS=$(git ls-files public/reports/*.html | wc -l)
TRACKED_DATA=$(git ls-files public/data/*.json | wc -l)
echo "  Tracked Reports: $TRACKED_REPORTS"
echo "  Tracked Data: $TRACKED_DATA"

# Warning if files are not tracked
if [ "$TRACKED_REPORTS" -lt "$REPORT_COUNT" ]; then
  echo "⚠️  WARNING: Some reports are not tracked in git!"
fi
if [ "$TRACKED_DATA" -lt "$DATA_COUNT" ]; then
  echo "⚠️  WARNING: Some data files are not tracked in git!"
fi

echo ""
echo "================================================"
echo "REMEMBER: ALL LOCAL FILES MUST BE PRESERVED"
echo "Only remote deployment is cleaned for space"
echo "================================================"
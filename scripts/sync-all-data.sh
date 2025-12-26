#!/bin/bash
# eToro Census - Complete Data Sync Script
# Syncs all data from remote repositories and archive to public/data

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  eToro Census - Complete Data Sync${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"

# Change to project root
cd "$PROJECT_ROOT"

# Step 1: Fetch all remote branches
echo -e "${YELLOW}[1/5]${NC} Fetching remote updates..."
git fetch --all
echo -e "${GREEN}✓${NC} Remote updates fetched\n"

# Step 2: Pull master branch
echo -e "${YELLOW}[2/5]${NC} Updating master branch..."
MASTER_BEFORE=$(git rev-parse HEAD)
git pull origin master
MASTER_AFTER=$(git rev-parse HEAD)

if [ "$MASTER_BEFORE" = "$MASTER_AFTER" ]; then
    echo -e "${GREEN}✓${NC} Master branch already up to date\n"
else
    echo -e "${GREEN}✓${NC} Master branch updated\n"
fi

# Step 3: Pull archive worktree (data-archive branch)
echo -e "${YELLOW}[3/5]${NC} Updating archive worktree..."
if [ ! -d "$PROJECT_ROOT/archive" ]; then
    echo -e "${RED}✗${NC} Archive worktree not found at $PROJECT_ROOT/archive"
    echo -e "${YELLOW}  Creating worktree...${NC}"
    git worktree add archive data-archive
    echo -e "${GREEN}✓${NC} Archive worktree created\n"
else
    cd "$PROJECT_ROOT/archive"
    ARCHIVE_BEFORE=$(git rev-parse HEAD)
    git pull origin data-archive
    ARCHIVE_AFTER=$(git rev-parse HEAD)

    if [ "$ARCHIVE_BEFORE" = "$ARCHIVE_AFTER" ]; then
        echo -e "${GREEN}✓${NC} Archive already up to date\n"
    else
        echo -e "${GREEN}✓${NC} Archive updated\n"
    fi
    cd "$PROJECT_ROOT"
fi

# Step 4: Verify archive data (historical files stay in archive only)
echo -e "${YELLOW}[4/5]${NC} Verifying archive data..."

ARCHIVE_DATA="$PROJECT_ROOT/archive/data"
PUBLIC_DATA="$PROJECT_ROOT/public/data"

if [ ! -d "$ARCHIVE_DATA" ]; then
    echo -e "${RED}✗${NC} Archive data directory not found: $ARCHIVE_DATA"
    exit 1
fi

# Count archive files
ARCHIVE_COUNT=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json 2>/dev/null | wc -l | tr -d ' ')
echo -e "${GREEN}✓${NC} Archive has $ARCHIVE_COUNT historical data files\n"
echo -e "${BLUE}ℹ${NC}  Note: Historical files stay in archive branch"
echo -e "${BLUE}ℹ${NC}  public/data contains only census-data-latest.json for web app\n"

# Step 5: Copy latest file from archive and update census-data-latest.json
echo -e "${YELLOW}[5/5]${NC} Updating latest data file..."

# Find the most recent data file in ARCHIVE
LATEST_FILE=$(ls -1t "$ARCHIVE_DATA"/etoro-data-*.json 2>/dev/null | head -1)

if [ -n "$LATEST_FILE" ]; then
    LATEST_FILENAME=$(basename "$LATEST_FILE")

    # Copy only the latest file to public/data
    cp "$LATEST_FILE" "$PUBLIC_DATA/$LATEST_FILENAME"

    # Create/update census-data-latest.json as a copy
    cd "$PUBLIC_DATA"
    if [ -f "census-data-latest.json" ]; then
        rm "census-data-latest.json"
    fi
    cp "$LATEST_FILENAME" "census-data-latest.json"

    # Extract date from filename
    LATEST_DATE=$(echo "$LATEST_FILENAME" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    echo -e "${GREEN}✓${NC} Latest data copied: $LATEST_DATE\n"
    cd "$PROJECT_ROOT"
else
    echo -e "${RED}✗${NC} No data files found in archive\n"
fi

# Summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Sync Complete${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"

# Count total files
TOTAL_ARCHIVE=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json 2>/dev/null | wc -l | tr -d ' ')
TOTAL_PUBLIC=$(ls -1 "$PUBLIC_DATA"/*.json 2>/dev/null | wc -l | tr -d ' ')

echo -e "${GREEN}✓${NC} Archive data: ${TOTAL_ARCHIVE} historical files"
echo -e "${GREEN}✓${NC} Public data:  ${TOTAL_PUBLIC} files (latest + census-data-latest.json)"

# Show archive date range
if [ $TOTAL_ARCHIVE -gt 0 ]; then
    FIRST_ARCHIVE=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json | head -1 | xargs basename)
    LAST_ARCHIVE=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json | tail -1 | xargs basename)
    FIRST_DATE=$(echo "$FIRST_ARCHIVE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    LAST_DATE=$(echo "$LAST_ARCHIVE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    echo -e "${GREEN}✓${NC} Archive range: ${FIRST_DATE} to ${LAST_DATE}"
fi

echo -e "\n${GREEN}All data synchronized successfully!${NC}\n"

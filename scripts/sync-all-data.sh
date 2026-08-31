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
echo -e "${BLUE}ℹ${NC}  Note: All historical files stay in archive branch"
echo -e "${BLUE}ℹ${NC}  public/data gets last 60 days for local analysis (gitignored)\n"

# Step 5: Copy recent data files for analysis scripts (last 60 days)
echo -e "${YELLOW}[5/5]${NC} Syncing recent data files for analysis..."

# Find the most recent data files in ARCHIVE (last 60 files = ~2 months)
# Sort by filename (not modification time) since filenames contain YYYY-MM-DD dates
RECENT_FILES=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json 2>/dev/null | sort -r | head -60)

if [ -n "$RECENT_FILES" ]; then
    # Place recent files into public/data for the analysis scripts.
    #
    # A plain `cp` here is what filled the VPS root volume: this script never
    # removes older files, so public/data accumulated 614 full copies, 54 GB on
    # a 150 GB disk. Once those were collapsed onto the archive the plain cp
    # became actively fatal too, because `cp src dst` where dst resolves to src
    # exits nonzero and this script runs under `set -e`, aborting the sync
    # before census-data-latest.json is ever refreshed.
    #
    # place_one picks clone, hardlink or symlink for the host and always
    # returns 0. See scripts/lib/place-files.sh.
    . "$PROJECT_ROOT/scripts/lib/place-files.sh"
    LINK_MODE=$(detect_link_mode "$ARCHIVE_DATA" "$PUBLIC_DATA")
    echo -e "${BLUE}ℹ${NC}  Placement mode: $LINK_MODE"
    while IFS= read -r file; do
        place_one "$LINK_MODE" "$file" "$PUBLIC_DATA" "archive/data"
    done <<< "$RECENT_FILES"

    # Get the latest file for census-data-latest.json
    LATEST_FILE=$(echo "$RECENT_FILES" | head -1)
    LATEST_FILENAME=$(basename "$LATEST_FILE")
    LATEST_DATE=$(echo "$LATEST_FILENAME" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    FILES_COPIED=$(echo "$RECENT_FILES" | wc -l | tr -d ' ')

    # Coverage gate — matches COVERAGE_THRESHOLD = 0.95 in analysis/lib/utils.ts
    cd "$PUBLIC_DATA"
    PASS=$(node -e "
      const data = JSON.parse(require('fs').readFileSync('$LATEST_FILENAME', 'utf8'));
      const slice = data.investors.slice(0, 1500);
      const withPortfolio = slice.filter(i => i.portfolio?.positions?.length > 0).length;
      const coverage = slice.length > 0 ? withPortfolio / slice.length : 0;
      process.exit(coverage >= 0.80 ? 0 : 1);
    " && echo "true" || echo "false")

    if [ "$PASS" = "true" ]; then
        if [ -f "census-data-latest.json" ]; then
            rm "census-data-latest.json"
        fi
        cp "$LATEST_FILENAME" "census-data-latest.json"
        echo -e "${GREEN}✓${NC} Synced last ${FILES_COPIED} data files for analysis"
        echo -e "${GREEN}✓${NC} Latest data: $LATEST_DATE (coverage ≥80%)\n"
    else
        echo -e "${GREEN}✓${NC} Synced last ${FILES_COPIED} data files for analysis"
        echo -e "${YELLOW}⚠${NC} Latest data ($LATEST_DATE) has <80% portfolio coverage — kept previous census-data-latest.json\n"
    fi
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
TOTAL_PUBLIC=$(ls -1 "$PUBLIC_DATA"/etoro-data-*.json 2>/dev/null | wc -l | tr -d ' ')

echo -e "${GREEN}✓${NC} Archive data: ${TOTAL_ARCHIVE} historical files"
echo -e "${GREEN}✓${NC} Public data:  ${TOTAL_PUBLIC} files (last 60 days for analysis)"

# Show archive date range (sort by filename to get accurate dates)
if [ $TOTAL_ARCHIVE -gt 0 ]; then
    FIRST_ARCHIVE=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json | sort | head -1 | xargs basename)
    LAST_ARCHIVE=$(ls -1 "$ARCHIVE_DATA"/etoro-data-*.json | sort | tail -1 | xargs basename)
    FIRST_DATE=$(echo "$FIRST_ARCHIVE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    LAST_DATE=$(echo "$LAST_ARCHIVE" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}')
    echo -e "${GREEN}✓${NC} Archive range: ${FIRST_DATE} to ${LAST_DATE}"
fi

echo -e "\n${GREEN}All data synchronized successfully!${NC}\n"

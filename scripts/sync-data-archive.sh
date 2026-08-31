#!/bin/bash
#
# eToro Census Data Archive Synchronization Script
#
# Purpose: Automatically sync all historical census data from the data-archive
#          branch to local public/data and public/reports directories.
#
# Usage: ./scripts/sync-data-archive.sh
#
# Automation: Scheduled to run daily at 3 AM via macOS LaunchAgent
#

set -e

# Configuration
REPO_DIR="$HOME/SourceCode/etoro_census"
ARCHIVE_DIR="$REPO_DIR/archive"
LOG_FILE="/tmp/etoro-census-sync.log"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Start sync
log "Starting eToro census data archive sync..."

# Change to repository directory
if [ ! -d "$REPO_DIR" ]; then
    log_error "Repository directory not found: $REPO_DIR"
    exit 1
fi

cd "$REPO_DIR"

# Ensure we're in a git repository
if [ ! -d ".git" ]; then
    log_error "Not a git repository: $REPO_DIR"
    exit 1
fi

# Check if data-archive branch exists on remote
log "Checking for data-archive branch on GitHub..."
if ! git ls-remote --heads origin data-archive | grep -q data-archive; then
    log_error "data-archive branch not found on GitHub!"
    log_error "Please run the 'setup-data-archive' workflow first"
    exit 1
fi

# Check if worktree exists
if [ ! -d "$ARCHIVE_DIR" ]; then
    log "Creating data-archive worktree (first time setup)..."

    # Fetch the branch first
    git fetch origin data-archive:data-archive

    # Create worktree
    git worktree add archive data-archive

    log_success "Data-archive worktree created at $ARCHIVE_DIR"
else
    log "Data-archive worktree already exists"
fi

# Update archive branch from remote
log "Pulling latest data from GitHub..."
cd "$ARCHIVE_DIR"

# Stash any local changes (shouldn't be any, but just in case)
git stash > /dev/null 2>&1 || true

# Pull latest changes
if git pull origin data-archive; then
    log_success "Successfully pulled latest data from data-archive branch"
else
    log_error "Failed to pull from data-archive branch"
    exit 1
fi

# Count files in archive
ARCHIVE_JSON_COUNT=$(ls data/*.json 2>/dev/null | wc -l | tr -d ' ')
ARCHIVE_HTML_COUNT=$(ls reports/*.html 2>/dev/null | wc -l | tr -d ' ')

log "Archive branch contains:"
log "  📊 $ARCHIVE_JSON_COUNT JSON data files"
log "  📄 $ARCHIVE_HTML_COUNT HTML reports"

# Return to main repo
cd "$REPO_DIR"

# Ensure target directories exist
mkdir -p public/data public/reports

# Copy files to main repo directories
log "Copying files to working directories..."

# Count before copy
BEFORE_JSON=$(ls public/data/etoro-data-*.json 2>/dev/null | wc -l | tr -d ' ')
BEFORE_HTML=$(ls public/reports/etoro-census-*.html 2>/dev/null | wc -l | tr -d ' ')

# Place all files. public/ and archive/ hold the same dataset, so the goal is to
# make the second copy free rather than to write it: 52.09 GiB was reclaimed on the
# Mac (2026-08-27) and 54 GB on the VPS (2026-08-31). The per-host choice between
# clone, hardlink and symlink lives in one place so this script and sync-all-data.sh
# cannot drift apart, which they already did once.
. "$REPO_DIR/scripts/lib/place-files.sh"

LINK_MODE=$(detect_link_mode archive/data public/data)
log "Placement mode: $LINK_MODE"

place_files "$LINK_MODE" archive/data    public/data    '*.json' archive/data
place_files "$LINK_MODE" archive/reports public/reports '*.html' archive/reports

# Count after copy
AFTER_JSON=$(ls public/data/etoro-data-*.json 2>/dev/null | wc -l | tr -d ' ')
AFTER_HTML=$(ls public/reports/etoro-census-*.html 2>/dev/null | wc -l | tr -d ' ')

# Calculate new files
NEW_JSON=$((AFTER_JSON - BEFORE_JSON))
NEW_HTML=$((AFTER_HTML - BEFORE_HTML))

if [ $NEW_JSON -gt 0 ] || [ $NEW_HTML -gt 0 ]; then
    log_success "Downloaded $NEW_JSON new JSON files and $NEW_HTML new HTML reports"
else
    log "No new files (already up to date)"
fi

log_success "Sync complete!"
log "📊 Total local files:"
log "   - $AFTER_JSON JSON data files in public/data/"
log "   - $AFTER_HTML HTML reports in public/reports/"

# Check disk usage
TOTAL_SIZE=$(du -sh public/data public/reports 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "Unknown")
log "💾 Total disk usage: $(du -sh public/data 2>/dev/null | awk '{print $1}' || echo '?') (data) + $(du -sh public/reports 2>/dev/null | awk '{print $1}' || echo '?') (reports)"

# Success
log_success "All data synchronized successfully!"

exit 0

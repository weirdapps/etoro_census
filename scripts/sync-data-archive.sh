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

# Copy all files.
#
# APFS clone (-c), not a byte copy. public/ and archive/ hold the same 927 files,
# and on 2026-08-27 they were verified byte-identical yet sitting on DISTINCT
# physical blocks: 52.09 GiB of real disk spent storing one dataset twice. `cp -c`
# collapses them onto shared blocks, which reclaims that space while deleting
# nothing and changing no path. A plain `cp` over an identical destination rewrites
# it and BREAKS the clone, so without this line one nightly run at 07:20 undoes the
# whole reclaim.
#
# -c is BSD-only and GNU cp rejects it. The `2>/dev/null || true` below would
# swallow that rejection and silently copy NOTHING on Linux, so probe once and fall
# back explicitly rather than trusting the suppressor.
#
# Falling back to a PLAIN cp on Linux was itself the bug. On the VPS `archive` is a
# symlink to /mnt/data/census-archive (volume sdb) while public/ sits on / (sda1),
# so every run wrote a second full copy onto the small root volume: measured
# 2026-08-31 at 54 GB on a 150 GB disk, 79% full. Hardlinks cannot cross devices and
# ext4 has no reflink, so the only instrument left there is a symlink. Pick per host:
#   clone    - macOS/APFS, `cp -c`, shared blocks, real files on both sides
#   hardlink - Linux, archive and public on the SAME filesystem
#   symlink  - Linux, different filesystems (the VPS)
# GNU first, BSD second, and the order is load-bearing. GNU `stat -f '%d' path`
# does NOT mean "device id of path": -f is --file-system and the format must come
# from -c, so GNU reads BOTH words as filenames, fails on '%d', succeeds on path,
# and prints a whole filesystem dump to stdout while still exiting nonzero. Probing
# BSD-first therefore returns dump+id concatenated on Linux, and since the dump
# embeds the path, two directories on ONE filesystem would never compare equal and
# hardlink mode could never be selected. macOS rejects -c with rc=1 and an empty
# stdout, so GNU-first is clean on both.
_dev_of() { stat -c '%d' "$1" 2>/dev/null || stat -f '%d' "$1" 2>/dev/null; }

_probe=$(mktemp) || _probe=""
if [ -n "$_probe" ] && cp -c "$_probe" "${_probe}.clone" 2>/dev/null; then
  LINK_MODE="clone"
elif [ "$(_dev_of archive/data)" = "$(_dev_of public/data)" ]; then
  LINK_MODE="hardlink"
else
  LINK_MODE="symlink"
fi
rm -f "$_probe" "${_probe}.clone" 2>/dev/null || true
log "Placement mode: $LINK_MODE"

# Place every archive file into public/ without storing the dataset twice.
# $1 = source dir (relative to repo root), $2 = destination dir, $3 = glob.
place_files() {
  _src="$1"; _dst="$2"; _pat="$3"
  for _f in "$_src"/$_pat; do
    [ -e "$_f" ] || continue
    _bn=$(basename "$_f")
    if [ "$LINK_MODE" = "clone" ]; then
      # Re-cloning an existing clone is a no-op on disk, so do not try to skip it:
      # an APFS clone has a DISTINCT inode, which makes -ef the wrong test here.
      cp -c "$_f" "$_dst/$_bn" 2>/dev/null || cp "$_f" "$_dst/$_bn" 2>/dev/null || true
      continue
    fi
    # -ef is same device+inode and follows symlinks, so it is true for both an
    # existing hardlink and an existing good symlink, and false for a broken one.
    [ "$_dst/$_bn" -ef "$_f" ] && continue
    if [ "$LINK_MODE" = "hardlink" ]; then
      ln -f "$_f" "$_dst/$_bn" 2>/dev/null || cp "$_f" "$_dst/$_bn" 2>/dev/null || true
    else
      # Relative, so the tree stays valid if the repo moves. public/<x>/<f> needs
      # two levels up to reach the repo root before descending into $_src.
      if ln -sfn "../../$_src/$_bn" "$_dst/$_bn.tmplink" 2>/dev/null; then
        mv -f "$_dst/$_bn.tmplink" "$_dst/$_bn" 2>/dev/null || rm -f "$_dst/$_bn.tmplink"
      else
        cp "$_f" "$_dst/$_bn" 2>/dev/null || true
      fi
    fi
  done
}

place_files archive/data public/data '*.json'
place_files archive/reports public/reports '*.html'

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

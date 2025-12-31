# eToro Census - Scripts

Automation scripts for managing the eToro Census project.

## Quick Start

```bash
# Sync all data (recommended - run this daily)
npm run sync
```

## Available Scripts

### 🔄 sync-all-data.sh

**Purpose**: Complete data synchronization - fetches all remote updates and syncs files

**Usage**:
```bash
npm run sync
# or
bash scripts/sync-all-data.sh
```

**What it does**:
1. ✅ Fetches all remote branches (master + data-archive)
2. ✅ Pulls latest changes to master branch
3. ✅ Pulls latest changes to archive worktree
4. ✅ Copies new data files from `archive/data/` to `public/data/`
5. ✅ Updates `census-data-latest.json` symlink to newest file
6. ✅ Reports summary with file counts and date range

**When to use**:
- After daily census runs (when new data is published)
- Before running analysis scripts
- When you need the latest data for development

**Output**:
- ✅ Colored terminal output (green = success, yellow = info, red = error)
- ✅ Shows exactly which files were synced
- ✅ Displays total file counts and date range
- ✅ Clear error messages if something fails

## Architecture

### Data Flow

```
GitHub Remote (data-archive branch)
    ↓
    ↓ git pull
    ↓
Local archive/data/ (worktree)
    ↓
    ↓ sync-all-data.sh
    ↓
Local public/data/ (master branch)
    ↓
    ↓ analysis scripts
    ↓
Social media posts, reports, etc.
```

### Why This Architecture?

1. **Separate storage**: Archive branch stores ALL historical data (213+ files)
2. **Clean master**: Master branch stays lightweight for web app deployment
3. **Automatic sync**: One command syncs everything
4. **Analysis ready**: Scripts always have access to latest data in `public/data/`

## Troubleshooting

### "Archive worktree not found"
The script will automatically create it. If issues persist:
```bash
git worktree add archive data-archive
```

### "No data files found"
Check that the archive branch has data:
```bash
ls -l archive/data/
```

### Analysis scripts show old date
Run the sync script first:
```bash
npm run sync
```

## Best Practices

1. **Run sync daily**: Always run `npm run sync` before generating posts/reports
2. **Check output**: Review the summary to ensure files synced correctly
3. **Commit rarely**: Only commit to `public/data/` if intentionally updating master
4. **Trust the archive**: The data-archive branch is the source of truth

## Future Enhancements

Potential improvements:
- [ ] Add `sync-to-archive.sh` for reverse sync (local → archive)
- [ ] Add validation that synced files are valid JSON
- [ ] Add option to sync only last N days of data
- [ ] Add pre-commit hook to auto-sync before commits

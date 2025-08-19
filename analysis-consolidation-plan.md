# Analysis Scripts Consolidation Plan

## Current State Analysis (8 Scripts, ~2,677 Lines)

### Script Overview
1. **generate-daily-post.js** (267 lines) - Daily census updates
2. **generate-weekly-post.js** (296 lines) - Weekly analysis (Saturday to Saturday)  
3. **generate-monthly-post.js** (333 lines) - Monthly analysis (first of month)
4. **dynamic-hot-hands-analysis.js** (397 lines) - Identifies trending investors
5. **hot-hands-recent-additions.js** (275 lines) - Recent portfolio additions
6. **stock-recommendations-report.js** (179 lines) - Stock analysis
7. **corrected-stock-analysis.js** (258 lines) - Fixed stock analysis
8. **top100-performance-analysis.js** (299 lines) - Top 100 investor analysis

### Follower Distribution Subdirectory
9. **generate-follower-chart.js** (279 lines) - Creates follower distribution charts
10. **extract-top-investors.js** (95 lines) - Extracts top investor data

## Identified Common Patterns

### 1. Data File Access (ALL scripts)
```javascript
// Hardcoded paths (4 scripts)
const dataDir = '/Users/plessas/SourceCode/etoro_census/public/data/';

// Relative paths with fallback (3 scripts)  
const dataDir = fs.existsSync('./public/data') ? './public/data' : '../public/data';

// Simple relative (3 scripts)
const dataDir = './public/data';
```

### 2. Latest Data File Discovery (8 scripts)
```javascript
// Pattern repeated in all scripts
fs.readdirSync(dataDir)
  .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
  .sort()
  .reverse();
```

### 3. Date-Based File Selection
- **Daily**: Compare today vs yesterday (getLatestDataFiles)
- **Weekly**: Find Saturday reports (getWeeklyDataFiles)
- **Monthly**: Find first-of-month reports (getMonthlyDataFiles)

### 4. Common Functions (Duplicated 4+ times)
```javascript
function getAssetInfo(instrumentId) // 4 scripts
function calculateRiskAdjustedScore(investor) // 4 scripts
function getLatestDataFile() // 2 scripts
```

### 5. Instrument/Asset Mapping (6 scripts)
```javascript
// Create instrument lookup from data
const instrumentMap = new Map();
data.instruments.details.forEach(inst => {
  instrumentMap.set(inst.instrumentId, {...});
});
```

### 6. Output Patterns
- Console output with Unicode formatting (3 post generators)
- JSON file output to analysis-results (4 scripts)
- HTML generation (1 script)

### 7. Error Handling
- Most scripts have minimal error handling
- Some use try-catch for file reading
- No consistent error reporting

## Consolidation Strategy

### Phase 1: Create Shared Utilities Module
Create `analysis/lib/utils.js` with:

```javascript
module.exports = {
  // Data access
  getDataDirectory() // Smart path resolution
  getLatestDataFile() // Returns most recent file
  getLatestDataFiles(count) // Returns N most recent
  getWeeklyDataFiles() // Saturday to Saturday
  getMonthlyDataFiles() // First of month
  getAllDataFiles() // All files sorted
  
  // Data loading
  loadDataFile(filepath) // With error handling
  loadLatestData() // Load most recent
  loadDataByDate(date) // Find and load specific date
  
  // Asset/Instrument utilities
  createInstrumentMap(data) // Build lookup map
  getAssetInfo(instrumentId, instrumentMap) // Get asset details
  
  // Investor analysis
  calculateRiskAdjustedScore(investor)
  findTopCopierChanges(current, previous, threshold)
  findDailyMovers(currentHoldings, prevHoldings, threshold)
  
  // Formatting helpers
  formatDate(date) // Consistent date formatting
  formatPercentage(value) // With +/- signs
  formatNumber(value) // With commas
  
  // File output
  saveAnalysisResult(filename, data) // Save to analysis-results
  ensureOutputDirectory() // Create if needed
};
```

### Phase 2: Create Data Access Layer
Create `analysis/lib/data-access.js`:

```javascript
class DataAccess {
  constructor(options = {}) {
    this.dataDir = this.resolveDataDirectory();
    this.cache = new Map(); // Cache loaded files
  }
  
  getLatestData() // With caching
  getDataRange(startDate, endDate) // Get multiple files
  compareDataFiles(file1, file2) // Common comparison logic
}
```

### Phase 3: Script-Specific Refactoring Plan

#### A. Post Generators (Daily/Weekly/Monthly)
1. Extract common post formatting logic
2. Create base class `PostGenerator`
3. Inherit for specific intervals
4. Share copier change detection
5. Share holdings comparison

#### B. Hot Hands Scripts  
1. Merge `dynamic-hot-hands-analysis.js` and `hot-hands-recent-additions.js`
2. Extract momentum calculation
3. Share risk scoring logic
4. Consolidate output formatting

#### C. Stock Analysis Scripts
1. Merge `stock-recommendations-report.js` and `corrected-stock-analysis.js`
2. Extract holdings analysis
3. Share recommendation logic

### Phase 4: Testing Strategy

1. **Before Refactoring**:
   - Run each script and save outputs
   - Create test data snapshots
   - Document expected behaviors

2. **During Refactoring**:
   - Create unit tests for utils
   - Test each function in isolation
   - Compare outputs byte-by-byte

3. **After Refactoring**:
   - Run all scripts in parallel
   - Compare with saved outputs
   - Verify identical results

## Implementation Steps

### Step 1: Setup (Branch: feature/consolidate-analysis)
```bash
git checkout -b feature/consolidate-analysis
mkdir analysis/lib
mkdir analysis/test
mkdir analysis/test/snapshots
```

### Step 2: Create Utils Module
1. Create `analysis/lib/utils.js`
2. Add all common functions
3. Add comprehensive error handling
4. Create unit tests

### Step 3: Refactor One Script (Pilot)
1. Start with `generate-daily-post.js`
2. Replace duplicated code with utils
3. Test thoroughly
4. Compare output

### Step 4: Systematic Refactoring
1. Refactor remaining post generators
2. Refactor hot hands scripts
3. Refactor stock analysis scripts
4. Update follower distribution scripts

### Step 5: Validation
1. Run all original scripts - save outputs
2. Run all refactored scripts - save outputs
3. Diff all outputs
4. Fix any discrepancies

### Step 6: Cleanup
1. Remove duplicate code
2. Update documentation
3. Create migration guide
4. Update README

## Benefits After Consolidation

1. **Code Reduction**: ~40% reduction (estimated 1,600 lines from 2,677)
2. **Maintainability**: Single source of truth for common logic
3. **Reliability**: Consistent error handling
4. **Flexibility**: Easy to add new analysis types
5. **Testing**: Centralized test coverage
6. **Performance**: Cached data loading

## Risk Mitigation

1. **Git branch isolation**: All work in feature branch
2. **Original preservation**: Keep originals until verified
3. **Incremental approach**: One script at a time
4. **Output validation**: Byte-by-byte comparison
5. **Rollback plan**: Tag current state before changes

## Success Criteria

✅ All scripts produce identical output to originals
✅ No runtime errors in any script
✅ All tests pass
✅ Code coverage > 80% for utils
✅ Performance same or better
✅ Successfully runs in GitHub Actions

## Timeline Estimate

- Phase 1 (Utils): 2 hours
- Phase 2 (Data Layer): 1 hour  
- Phase 3 (Refactoring): 4 hours
- Phase 4 (Testing): 2 hours
- Total: ~9 hours of careful work
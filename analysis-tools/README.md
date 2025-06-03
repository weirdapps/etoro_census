# eToro Census Analysis Tools

This directory contains analysis scripts for processing eToro Popular Investors census data. All scripts work with the JSON data files in `public/data/`.

## Directory Structure

- **📊 `instruments/`** - Individual asset analysis tools
- **📈 `market-behavior/`** - Market-wide trend and behavior analysis
- **📝 `examples/`** - Example queries and demonstrations
- **🗄️ `deprecated/`** - Archived scripts (not recommended for use)

## Usage

All scripts should be run from the project root:
```bash
cd /Users/plessas/SourceCode/etoro_census
node analysis-tools/[folder]/[script-name].js [arguments]
```

## Data Requirements

Scripts analyze JSON files in `public/data/` with the format:
- `etoro-data-YYYY-MM-DD-HH-MM.json`
- Minimum 2 files needed for trend analysis
- All 1,500 top Popular Investors included in each file

## Key Concepts

- **Investors**: Unique individuals holding an asset
- **Positions**: Individual trades/positions (one investor can have multiple positions in same asset)
- **Holdings**: Whether an investor owns any amount of an asset
- **Accumulation**: Same investors adding more positions
- **Distribution**: Investors reducing positions
- **Adoption**: New investors starting to hold an asset

See individual folder READMEs for specific tool documentation.
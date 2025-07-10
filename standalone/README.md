# Standalone Analysis Tools

This directory contains analysis tools that run independently from the main eToro Census application.

## Risk-Return Analysis

**Location:** `risk-return/`
**Purpose:** Standalone risk vs return analysis for eToro Popular Investors
**Status:** Independent - does not integrate with main app

### Quick Start
```bash
# From project root
node standalone/risk-return/run-analysis.js
node standalone/risk-return/generate-etoro-post.js
```

### Features
- Complete risk-return analysis using Modern Portfolio Theory
- Efficient frontier calculations
- eToro post generation
- Chart data extraction for external use

### Independence
- Does not affect main app functionality
- No shared components with main census app
- Can be run separately without impacting daily reports
- Self-contained analysis tools

## Directory Structure
```
standalone/
├── README.md           # This file
└── risk-return/        # Risk-return analysis tools
    ├── README.md       # Detailed documentation
    ├── run-analysis.js # Main analysis runner
    └── ...            # Other analysis files
```

## Integration
These tools are designed to be:
- **Standalone**: No dependencies on main app
- **Independent**: Can run without affecting other processes
- **Portable**: Easy to move or use separately
- **Self-contained**: All dependencies included
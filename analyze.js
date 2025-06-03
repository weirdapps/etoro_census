#!/usr/bin/env node

// Quick launcher for analysis tools
const { spawn } = require('child_process');
const path = require('path');

const scripts = {
  // Market Behavior (most useful)
  'deltas': 'analysis-tools/market-behavior/analyze-investor-position-deltas.js',
  'trends': 'analysis-tools/market-behavior/analyze-popularity-trends.js',
  'top100': 'analysis-tools/market-behavior/analyze-popularity-trends-top100.js',
  'behavior': 'analysis-tools/market-behavior/analyze-holdings-vs-positions.js',
  
  // Instruments
  'btc': 'analysis-tools/instruments/analyze-btc-holdings.js',
  'instrument': 'analysis-tools/instruments/analyze-instrument-trends.js',
  'holders': 'analysis-tools/instruments/find-top-holders.js',
  
  // Examples
  'examples': 'analysis-tools/examples/analyze-examples.js'
};

const command = process.argv[2];
const args = process.argv.slice(3);

if (!command || command === 'help' || command === '--help') {
  console.log(`
eToro Census Analysis Tool Launcher

MARKET BEHAVIOR:
  node analyze.js deltas              🎯 Key insights: investor vs position deltas
  node analyze.js trends              📈 Asset popularity trends (all 1500)
  node analyze.js top100              👑 Elite investor behavior (top 100)
  node analyze.js behavior            🔄 Accumulation vs distribution patterns

INSTRUMENTS:
  node analyze.js btc                 ₿  Bitcoin-specific analysis
  node analyze.js instrument <name>   📊 Any instrument trends
  node analyze.js holders <name>      👥 Top holders of any asset

EXAMPLES:
  node analyze.js examples            📝 Common query demonstrations

EXAMPLES:
  node analyze.js deltas              # Overall market sentiment
  node analyze.js instrument tesla    # Tesla trends over time
  node analyze.js holders nvidia      # Top NVIDIA holders
  node analyze.js top100              # Elite investor preferences

For detailed help on any tool, see: analysis-tools/[folder]/README.md
`);
  process.exit(0);
}

if (!scripts[command]) {
  console.error(`Unknown command: ${command}`);
  console.error(`Run 'node analyze.js help' for available commands`);
  process.exit(1);
}

// Run the script
const scriptPath = scripts[command];
const child = spawn('node', [scriptPath, ...args], {
  cwd: __dirname,
  stdio: 'inherit'
});

child.on('close', (code) => {
  process.exit(code);
});
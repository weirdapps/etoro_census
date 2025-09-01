#!/usr/bin/env node

/**
 * Generate All Posts Script
 * Convenience script to run daily, weekly, and monthly post generators
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function runScript(scriptName, description) {
  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}${colors.bright}Running ${description}...${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);
  
  try {
    const scriptPath = path.join(__dirname, scriptName);
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n${colors.green}✅ ${description} completed successfully!${colors.reset}`);
  } catch (error) {
    console.error(`\n${colors.red}❌ Error running ${description}: ${error.message}${colors.reset}`);
    return false;
  }
  return true;
}

function main() {
  console.log(`${colors.blue}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     eToro Census - Social Media Post Generator      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const scripts = [
    { file: 'daily-post.js', name: 'Daily Post Generator' },
    { file: 'weekly-post.js', name: 'Weekly Post Generator' },
    { file: 'monthly-post.js', name: 'Monthly Post Generator' }
  ];

  let successCount = 0;
  
  for (const script of scripts) {
    if (runScript(script.file, script.name)) {
      successCount++;
    }
  }

  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}${colors.bright}Summary: ${successCount}/${scripts.length} posts generated successfully${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the script
main();
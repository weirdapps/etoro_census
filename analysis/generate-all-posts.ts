#!/usr/bin/env npx ts-node

/**
 * Generate All Posts Script
 * Convenience script to run daily, weekly, and monthly post generators
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface ScriptInfo {
  file: string;
  name: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function runScript(scriptName: string, description: string): boolean {
  console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}${colors.bright}Running ${description}...${colors.reset}`);
  console.log(`${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    const scriptPath = path.join(__dirname, scriptName);
    execSync(`npx ts-node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`\n${colors.green}✅ ${description} completed successfully!${colors.reset}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n${colors.red}❌ Error running ${description}: ${message}${colors.reset}`);
    return false;
  }
  return true;
}

function main(): void {
  console.log(`${colors.blue}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     eToro Census - Social Media Post Generator      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const scripts: ScriptInfo[] = [
    { file: 'daily-post.ts', name: 'Daily Post Generator' },
    { file: 'weekly-post.ts', name: 'Weekly Post Generator' },
    { file: 'monthly-post.ts', name: 'Monthly Post Generator' }
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

main();

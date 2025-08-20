/**
 * Production Safety Validation Script
 * Ensures refactored code won't break daily GitHub Actions workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 PRODUCTION SAFETY VALIDATION');
console.log('================================\n');

let criticalIssues = 0;
let warnings = 0;

function testCritical(name, fn) {
  try {
    fn();
    console.log(`✅ CRITICAL: ${name}`);
  } catch (error) {
    console.log(`❌ CRITICAL FAILURE: ${name}`);
    console.log(`   Error: ${error.message}`);
    criticalIssues++;
  }
}

function testWarning(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.log(`⚠️  WARNING: ${name}`);
    console.log(`   Error: ${error.message}`);
    warnings++;
  }
}

// 1. CRITICAL: Verify data directory exists and is accessible
testCritical('Data directory exists', () => {
  const dataDir = './public/data';
  if (!fs.existsSync(dataDir)) {
    throw new Error('Data directory not found');
  }
  const files = fs.readdirSync(dataDir);
  if (files.length === 0) {
    throw new Error('No data files in directory');
  }
});

// 2. CRITICAL: Verify reports directory exists
testCritical('Reports directory exists', () => {
  const reportsDir = './public/reports';
  if (!fs.existsSync(reportsDir)) {
    throw new Error('Reports directory not found');
  }
});

// 3. CRITICAL: Test that utilities work from project root
testCritical('Utils work from project root', () => {
  const utils = require('../lib/utils');
  const dataDir = utils.getDataDirectory();
  if (!dataDir) throw new Error('Cannot get data directory');
  
  const latest = utils.getLatestDataFile();
  if (!latest.filepath) throw new Error('Cannot get latest file');
  
  const data = utils.loadLatestData();
  if (!data.metadata) throw new Error('Cannot load data');
});

// 4. CRITICAL: Verify no hardcoded paths in refactored code
testCritical('No hardcoded paths in refactored scripts', () => {
  const refactoredFiles = [
    './analysis/generate-daily-post-refactored.js',
    './analysis/generate-weekly-post-refactored.js',
    './analysis/generate-monthly-post-refactored.js'
  ];
  
  refactoredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('/Users/plessas/')) {
        throw new Error(`Hardcoded path found in ${file}`);
      }
    }
  });
});

// 5. CRITICAL: Test that original scripts still work
testCritical('Original daily script still works', () => {
  try {
    execSync('node analysis/generate-daily-post.js > /dev/null 2>&1', { 
      timeout: 5000,
      cwd: process.cwd()
    });
  } catch (error) {
    if (error.status !== 0) {
      throw new Error('Original daily script failed');
    }
  }
});

// 6. CRITICAL: Verify GitHub workflow compatibility
testCritical('GitHub workflow file unchanged', () => {
  const workflowPath = './.github/workflows/daily-census.yml';
  if (!fs.existsSync(workflowPath)) {
    throw new Error('GitHub workflow not found');
  }
  
  const content = fs.readFileSync(workflowPath, 'utf8');
  
  // Check critical lines haven't changed
  if (!content.includes('public/reports/*.html')) {
    throw new Error('Workflow reports path changed');
  }
  if (!content.includes('public/data/*.json')) {
    throw new Error('Workflow data path changed');
  }
  if (!content.includes('/api/optimized-report')) {
    throw new Error('Workflow API endpoint changed');
  }
});

// 7. WARNING: Check if we're on the correct branch
testWarning('On feature branch', () => {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  if (branch !== 'feature/consolidate-analysis') {
    throw new Error(`On branch ${branch}, expected feature/consolidate-analysis`);
  }
});

// 8. WARNING: Check for uncommitted changes
testWarning('All changes committed', () => {
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  if (status.trim() !== '') {
    throw new Error('Uncommitted changes detected');
  }
});

// 9. CRITICAL: Verify data file naming convention
testCritical('Data files follow naming convention', () => {
  const dataDir = './public/data';
  const files = fs.readdirSync(dataDir);
  const dataFiles = files.filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'));
  
  if (dataFiles.length === 0) {
    throw new Error('No properly named data files found');
  }
  
  // Check date format in filenames
  const invalidFiles = dataFiles.filter(f => {
    const match = f.match(/etoro-data-(\d{4}-\d{2}-\d{2})-\d{2}-\d{2}\.json/);
    return !match;
  });
  
  if (invalidFiles.length > 0) {
    throw new Error(`Invalid file names: ${invalidFiles.join(', ')}`);
  }
});

// 10. CRITICAL: Test that we can write to analysis-results
testCritical('Can write to analysis-results directory', () => {
  const testFile = './public/analysis-results/test-write-' + Date.now() + '.txt';
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (error) {
    throw new Error('Cannot write to analysis-results directory');
  }
});

// Summary
console.log('\n================================');
console.log('VALIDATION RESULTS:');
console.log('================================');

if (criticalIssues === 0 && warnings === 0) {
  console.log('\n✅ ALL CHECKS PASSED - Safe to proceed');
  console.log('Production workflow will NOT be affected');
  console.log('\nREMINDER: Do NOT merge until:');
  console.log('1. All scripts are refactored');
  console.log('2. All outputs match exactly');
  console.log('3. Test run with actual GitHub workflow');
} else if (criticalIssues > 0) {
  console.log(`\n❌ CRITICAL ISSUES: ${criticalIssues}`);
  console.log('DO NOT MERGE - Production will break!');
  process.exit(1);
} else {
  console.log(`\n⚠️  Warnings: ${warnings}`);
  console.log('Review warnings but safe to continue');
}

console.log('\nNEXT STEPS:');
console.log('1. Continue refactoring remaining scripts');
console.log('2. Test each refactored script thoroughly');
console.log('3. Run this validation again before merging');
console.log('4. Consider running a test with GitHub Actions on feature branch');
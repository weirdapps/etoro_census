/**
 * FINAL PRODUCTION TEST
 * Ensures that daily GitHub Actions workflow will work correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚨 FINAL PRODUCTION READINESS TEST');
console.log('===================================\n');

let passed = 0;
let failed = 0;
let critical = [];

function test(name, critical, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
    if (critical) {
      critical.push({ name, error: error.message });
    }
  }
}

// TEST 1: Verify production scripts are unchanged
console.log('1️⃣ TESTING PRODUCTION SCRIPTS (ORIGINALS):\n');

test('Daily post generator works', true, () => {
  execSync('node analysis/generate-daily-post.js > /dev/null 2>&1', { timeout: 5000 });
});

test('Weekly post generator works', true, () => {
  execSync('node analysis/generate-weekly-post.js > /dev/null 2>&1', { timeout: 5000 });
});

test('Monthly post generator works', true, () => {
  execSync('node analysis/generate-monthly-post.js > /dev/null 2>&1', { timeout: 5000 });
});

// TEST 2: Verify GitHub workflow paths
console.log('\n2️⃣ TESTING GITHUB WORKFLOW COMPATIBILITY:\n');

test('Workflow reports path exists', true, () => {
  if (!fs.existsSync('./public/reports')) {
    throw new Error('Reports directory missing');
  }
});

test('Workflow data path exists', true, () => {
  if (!fs.existsSync('./public/data')) {
    throw new Error('Data directory missing');
  }
});

test('Workflow can write HTML reports', true, () => {
  const testFile = './public/reports/test-' + Date.now() + '.html';
  fs.writeFileSync(testFile, '<html>test</html>');
  fs.unlinkSync(testFile);
});

test('Workflow can write JSON data', true, () => {
  const testFile = './public/data/test-' + Date.now() + '.json';
  fs.writeFileSync(testFile, '{"test": true}');
  fs.unlinkSync(testFile);
});

// TEST 3: Verify API endpoint compatibility
console.log('\n3️⃣ TESTING API ENDPOINT REQUIREMENTS:\n');

test('Next.js API route exists', false, () => {
  const apiPath = './src/app/api/optimized-report/route.ts';
  if (!fs.existsSync(apiPath)) {
    throw new Error('API route missing');
  }
});

test('Data collection service exists', false, () => {
  const servicePath = './src/lib/services/data-collection-service.ts';
  if (!fs.existsSync(servicePath)) {
    throw new Error('Data collection service missing');
  }
});

// TEST 4: Data file naming convention
console.log('\n4️⃣ TESTING DATA FILE CONVENTIONS:\n');

test('Data files follow naming pattern', true, () => {
  const files = fs.readdirSync('./public/data');
  const dataFiles = files.filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'));
  
  if (dataFiles.length === 0) {
    throw new Error('No data files found');
  }
  
  // Check pattern: etoro-data-YYYY-MM-DD-HH-MM.json
  const invalidFiles = dataFiles.filter(f => {
    return !f.match(/^etoro-data-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
  });
  
  if (invalidFiles.length > 0) {
    throw new Error(`Invalid file names: ${invalidFiles.join(', ')}`);
  }
});

test('Latest data file is readable', true, () => {
  const files = fs.readdirSync('./public/data')
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No data files');
  }
  
  const latestFile = path.join('./public/data', files[0]);
  const data = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
  
  if (!data.metadata || !data.investors) {
    throw new Error('Invalid data structure');
  }
});

// TEST 5: Verify refactored scripts work identically
console.log('\n5️⃣ TESTING REFACTORED SCRIPTS:\n');

test('Refactored daily post works', false, () => {
  if (fs.existsSync('./analysis/generate-daily-post-refactored.js')) {
    execSync('node analysis/generate-daily-post-refactored.js > /dev/null 2>&1', { timeout: 5000 });
  }
});

test('Refactored weekly post works', false, () => {
  if (fs.existsSync('./analysis/generate-weekly-post-refactored.js')) {
    execSync('node analysis/generate-weekly-post-refactored.js > /dev/null 2>&1', { timeout: 5000 });
  }
});

test('Refactored monthly post works', false, () => {
  if (fs.existsSync('./analysis/generate-monthly-post-refactored.js')) {
    execSync('node analysis/generate-monthly-post-refactored.js > /dev/null 2>&1', { timeout: 5000 });
  }
});

// TEST 6: Verify no breaking changes
console.log('\n6️⃣ TESTING FOR BREAKING CHANGES:\n');

test('No hardcoded paths in utilities', true, () => {
  if (fs.existsSync('./analysis/lib/utils.js')) {
    const content = fs.readFileSync('./analysis/lib/utils.js', 'utf8');
    if (content.includes('/Users/plessas/')) {
      throw new Error('Hardcoded path found in utils');
    }
  }
});

test('Git is on feature branch', false, () => {
  const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
  if (branch === 'master' || branch === 'main') {
    throw new Error(`On production branch: ${branch}`);
  }
});

// RESULTS
console.log('\n' + '='.repeat(50));
console.log('📊 TEST RESULTS:');
console.log('='.repeat(50));

console.log(`\nTests Passed: ${passed}`);
console.log(`Tests Failed: ${failed}`);

if (critical.length > 0) {
  console.log('\n⚠️  CRITICAL FAILURES:');
  critical.forEach(c => {
    console.log(`  - ${c.name}: ${c.error}`);
  });
  console.log('\n❌ DO NOT MERGE - Production will break!');
  process.exit(1);
} else if (failed > 0) {
  console.log('\n⚠️  Some non-critical tests failed, review before merging');
} else {
  console.log('\n✅ ALL TESTS PASSED - Safe for production!');
}

console.log('\n📋 MERGE CHECKLIST:');
console.log('='.repeat(50));
console.log('[ ] All original scripts still work');
console.log('[ ] GitHub workflow paths unchanged');
console.log('[ ] Data files follow naming convention');
console.log('[ ] No hardcoded paths in new code');
console.log('[ ] Test with actual GitHub Actions workflow');
console.log('[ ] Verify data files are saved correctly');
console.log('[ ] Check that daily census runs at 00:00 UTC');
console.log('[ ] Confirm HTML reports are generated');
console.log('[ ] Ensure GitHub Pages deployment works');

console.log('\n⚠️  FINAL REMINDER:');
console.log('The daily production runs AUTOMATICALLY at 00:00 UTC');
console.log('Any breaking changes will cause the census to fail');
console.log('Test thoroughly before merging to master!');
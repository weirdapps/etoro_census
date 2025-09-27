#!/usr/bin/env node

/**
 * Cleanup old reports to prevent disk space issues during deployment
 * Keeps only the last 30 days of reports
 */

const fs = require('fs');
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '..', 'public', 'reports');
const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const DAYS_TO_KEEP = 30;

function getFileDate(filename) {
  // Extract date from filename format: etoro-data-2025-09-15-02-03.json
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/);
  return match ? new Date(match[1]) : null;
}

function cleanupDirectory(dir, pattern) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory ${dir} does not exist, skipping...`);
    return;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);

  const files = fs.readdirSync(dir);
  let deletedCount = 0;
  let keptCount = 0;

  files.forEach(file => {
    if (!file.match(pattern)) return;

    const filePath = path.join(dir, file);
    const fileDate = getFileDate(file);

    if (fileDate && fileDate < cutoffDate) {
      try {
        fs.unlinkSync(filePath);
        console.log(`Deleted: ${file} (${fileDate.toISOString().split('T')[0]})`);
        deletedCount++;
      } catch (err) {
        console.error(`Error deleting ${file}:`, err.message);
      }
    } else {
      keptCount++;
    }
  });

  console.log(`${dir}: Deleted ${deletedCount} files, kept ${keptCount} files`);
}

console.log(`Cleaning up reports older than ${DAYS_TO_KEEP} days...`);
console.log('');

// Clean HTML reports
cleanupDirectory(REPORTS_DIR, /etoro-census-.*\.html$/);

// Clean JSON data files
cleanupDirectory(DATA_DIR, /etoro-data-.*\.json$/);

console.log('\nCleanup complete!');
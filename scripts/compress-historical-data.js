#!/usr/bin/env node
/**
 * Compress Historical Data Script
 *
 * Compresses JSON files older than 7 days using gzip.
 * Maintains directory structure: archive/YYYY/MM/filename.json.gz
 *
 * Usage: node scripts/compress-historical-data.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const CURRENT_DIR = path.join(DATA_DIR, 'current');
const DAYS_TO_KEEP_UNCOMPRESSED = 7;

// Files to never compress/move
const PROTECTED_FILES = [
  'census-data-latest.json',
  'latest-census.json',
  '.gitignore',
  'README.md'
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    force: args.includes('--force')
  };
}

function getFileDate(filename) {
  // Extract date from filename like: etoro-data-2025-06-15-02-03.json
  const match = filename.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(`${match[1]}-${match[2]}-${match[3]}`);
  }
  return null;
}

function isOlderThanDays(date, days) {
  const now = new Date();
  const diffTime = now - date;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays > days;
}

async function compressFile(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);
    const gzip = zlib.createGzip({ level: 9 });

    input.pipe(gzip).pipe(output);

    output.on('finish', () => {
      const originalSize = fs.statSync(sourcePath).size;
      const compressedSize = fs.statSync(destPath).size;
      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      resolve({ originalSize, compressedSize, ratio });
    });

    output.on('error', reject);
    input.on('error', reject);
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

async function main() {
  const { dryRun, verbose, force } = parseArgs();

  console.log('=== Historical Data Compression ===\n');

  if (dryRun) {
    console.log('DRY RUN MODE - No files will be modified\n');
  }

  // Ensure directories exist
  if (!dryRun) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
    fs.mkdirSync(CURRENT_DIR, { recursive: true });
  }

  // Get all JSON files in data directory (not in subdirectories)
  const files = fs.readdirSync(DATA_DIR).filter(f => {
    const fullPath = path.join(DATA_DIR, f);
    return fs.statSync(fullPath).isFile() &&
           f.endsWith('.json') &&
           !PROTECTED_FILES.includes(f);
  });

  console.log(`Found ${files.length} JSON files to process\n`);

  let totalOriginal = 0;
  let totalCompressed = 0;
  let filesCompressed = 0;
  let filesMoved = 0;
  let filesSkipped = 0;

  for (const filename of files) {
    const sourcePath = path.join(DATA_DIR, filename);
    const fileDate = getFileDate(filename);

    if (!fileDate) {
      if (verbose) console.log(`Skipping ${filename} - cannot parse date`);
      filesSkipped++;
      continue;
    }

    const isOld = isOlderThanDays(fileDate, DAYS_TO_KEEP_UNCOMPRESSED);

    if (isOld) {
      // Compress and move to archive
      const year = fileDate.getFullYear();
      const month = String(fileDate.getMonth() + 1).padStart(2, '0');
      const archiveSubdir = path.join(ARCHIVE_DIR, String(year), month);
      const destPath = path.join(archiveSubdir, filename + '.gz');

      if (!dryRun) {
        fs.mkdirSync(archiveSubdir, { recursive: true });
      }

      // Check if already compressed
      if (fs.existsSync(destPath) && !force) {
        if (verbose) console.log(`Skipping ${filename} - already compressed`);
        filesSkipped++;
        continue;
      }

      const originalSize = fs.statSync(sourcePath).size;

      if (dryRun) {
        console.log(`Would compress: ${filename} (${formatBytes(originalSize)})`);
        console.log(`  -> ${path.relative(DATA_DIR, destPath)}`);
        filesCompressed++;
        totalOriginal += originalSize;
        // Estimate 90% compression
        totalCompressed += originalSize * 0.1;
      } else {
        try {
          const result = await compressFile(sourcePath, destPath);
          console.log(`Compressed: ${filename}`);
          console.log(`  ${formatBytes(result.originalSize)} -> ${formatBytes(result.compressedSize)} (${result.ratio}% reduction)`);

          // Remove original file after successful compression
          fs.unlinkSync(sourcePath);

          filesCompressed++;
          totalOriginal += result.originalSize;
          totalCompressed += result.compressedSize;
        } catch (error) {
          console.error(`Error compressing ${filename}:`, error.message);
        }
      }
    } else {
      // Move to current directory (keep uncompressed)
      const destPath = path.join(CURRENT_DIR, filename);

      if (sourcePath !== destPath) {
        if (dryRun) {
          console.log(`Would move to current: ${filename}`);
        } else {
          fs.renameSync(sourcePath, destPath);
          if (verbose) console.log(`Moved to current: ${filename}`);
        }
        filesMoved++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Files compressed: ${filesCompressed}`);
  console.log(`Files moved to current: ${filesMoved}`);
  console.log(`Files skipped: ${filesSkipped}`);

  if (filesCompressed > 0) {
    console.log(`\nSpace savings:`);
    console.log(`  Original: ${formatBytes(totalOriginal)}`);
    console.log(`  Compressed: ${formatBytes(totalCompressed)}`);
    console.log(`  Saved: ${formatBytes(totalOriginal - totalCompressed)} (${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%)`);
  }

  if (dryRun) {
    console.log('\nRun without --dry-run to apply changes');
  }
}

main().catch(console.error);

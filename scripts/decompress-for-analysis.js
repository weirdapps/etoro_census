#!/usr/bin/env node
/**
 * Decompress Data for Analysis Script
 *
 * Decompresses archived .json.gz files for ad-hoc analysis.
 *
 * Usage:
 *   node scripts/decompress-for-analysis.js <date-pattern>
 *   node scripts/decompress-for-analysis.js 2025-06         # All June 2025 files
 *   node scripts/decompress-for-analysis.js 2025-06-15      # Specific date
 *   node scripts/decompress-for-analysis.js --all           # All archived files
 *   node scripts/decompress-for-analysis.js --list          # List available archives
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const DATA_DIR = path.join(__dirname, '..', 'public', 'data');
const ARCHIVE_DIR = path.join(DATA_DIR, 'archive');
const TEMP_DIR = path.join(DATA_DIR, 'temp-analysis');

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function getAllArchives() {
  const archives = [];

  if (!fs.existsSync(ARCHIVE_DIR)) {
    return archives;
  }

  const years = fs.readdirSync(ARCHIVE_DIR).filter(f =>
    fs.statSync(path.join(ARCHIVE_DIR, f)).isDirectory()
  );

  for (const year of years) {
    const yearPath = path.join(ARCHIVE_DIR, year);
    const months = fs.readdirSync(yearPath).filter(f =>
      fs.statSync(path.join(yearPath, f)).isDirectory()
    );

    for (const month of months) {
      const monthPath = path.join(yearPath, month);
      const files = fs.readdirSync(monthPath).filter(f => f.endsWith('.gz'));

      for (const file of files) {
        const fullPath = path.join(monthPath, file);
        const stat = fs.statSync(fullPath);
        archives.push({
          path: fullPath,
          relativePath: path.relative(ARCHIVE_DIR, fullPath),
          filename: file,
          size: stat.size,
          year,
          month
        });
      }
    }
  }

  return archives.sort((a, b) => a.filename.localeCompare(b.filename));
}

function listArchives() {
  const archives = getAllArchives();

  if (archives.length === 0) {
    console.log('No archived files found.');
    return;
  }

  console.log('=== Archived Data Files ===\n');

  let totalSize = 0;
  let currentYear = '';
  let currentMonth = '';

  for (const archive of archives) {
    if (archive.year !== currentYear) {
      currentYear = archive.year;
      console.log(`\n${currentYear}/`);
    }
    if (archive.month !== currentMonth) {
      currentMonth = archive.month;
      console.log(`  ${currentMonth}/`);
    }

    const basename = archive.filename.replace('.gz', '');
    console.log(`    ${basename} (${formatBytes(archive.size)})`);
    totalSize += archive.size;
  }

  console.log(`\nTotal: ${archives.length} files, ${formatBytes(totalSize)} compressed`);
  console.log('\nTo decompress, run:');
  console.log('  node scripts/decompress-for-analysis.js 2025-06    # All June 2025');
  console.log('  node scripts/decompress-for-analysis.js 2025-06-15 # Specific date');
}

async function decompressFile(sourcePath, destPath) {
  return new Promise((resolve, reject) => {
    const input = fs.createReadStream(sourcePath);
    const output = fs.createWriteStream(destPath);
    const gunzip = zlib.createGunzip();

    input.pipe(gunzip).pipe(output);

    output.on('finish', () => {
      const decompressedSize = fs.statSync(destPath).size;
      resolve({ decompressedSize });
    });

    output.on('error', reject);
    input.on('error', reject);
    gunzip.on('error', reject);
  });
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage:');
    console.log('  node scripts/decompress-for-analysis.js <date-pattern>');
    console.log('  node scripts/decompress-for-analysis.js --list');
    console.log('  node scripts/decompress-for-analysis.js --all');
    console.log('\nExamples:');
    console.log('  2025-06       All June 2025 files');
    console.log('  2025-06-15    Specific date');
    console.log('  --all         All archived files');
    console.log('  --list        List available archives');
    return;
  }

  if (args.includes('--list')) {
    listArchives();
    return;
  }

  const archives = getAllArchives();

  if (archives.length === 0) {
    console.log('No archived files found.');
    return;
  }

  // Filter archives by pattern
  let toDecompress = archives;
  const pattern = args.find(a => !a.startsWith('--'));

  if (pattern && !args.includes('--all')) {
    toDecompress = archives.filter(a => a.filename.includes(pattern));
  }

  if (toDecompress.length === 0) {
    console.log(`No files match pattern: ${pattern}`);
    console.log('Use --list to see available archives');
    return;
  }

  console.log(`=== Decompressing ${toDecompress.length} files ===\n`);

  // Create temp directory
  fs.mkdirSync(TEMP_DIR, { recursive: true });

  let totalDecompressed = 0;

  for (const archive of toDecompress) {
    const destFilename = archive.filename.replace('.gz', '');
    const destPath = path.join(TEMP_DIR, destFilename);

    try {
      const result = await decompressFile(archive.path, destPath);
      console.log(`Decompressed: ${destFilename} (${formatBytes(result.decompressedSize)})`);
      totalDecompressed += result.decompressedSize;
    } catch (error) {
      console.error(`Error decompressing ${archive.filename}:`, error.message);
    }
  }

  console.log(`\n=== Complete ===`);
  console.log(`Files: ${toDecompress.length}`);
  console.log(`Total size: ${formatBytes(totalDecompressed)}`);
  console.log(`Output directory: ${TEMP_DIR}`);
  console.log('\nRemember to clean up when done:');
  console.log(`  rm -rf ${TEMP_DIR}`);
}

main().catch(console.error);

/**
 * Standalone PI Feed Collection Script
 *
 * Fetches posts from top Popular Investors across 5 categories
 * using the existing feed-service infrastructure.
 *
 * Usage: npx tsx analysis/collect-feeds.ts
 * Requires: ETORO_USER_KEY and ETORO_API_KEY env vars
 */

import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load .env.local from project root
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { getLatestDataFile, loadDataFile, ensureOutputDirectory } from './lib/utils';
import { getUsersDetailsByUsernames } from '../src/lib/services/user-service';
import { collectPIFeeds } from '../src/lib/services/feed-service';
import type { PopularInvestor } from '../src/lib/models/user';
import type { Investor } from './lib/types';

/**
 * Convert census Investor to PopularInvestor format expected by feed-service
 */
function toPopularInvestor(inv: Investor): PopularInvestor {
  return {
    customerId: inv.customerId,
    userName: inv.userName,
    fullName: inv.fullName,
    hasAvatar: inv.hasAvatar,
    popularInvestor: inv.popularInvestor,
    gain: inv.gain,
    dailyGain: inv.dailyGain,
    riskScore: inv.riskScore,
    copiers: inv.copiers,
    trades: inv.trades || 0,
    winRatio: inv.winRatio || 0,
  };
}

async function main(): Promise<void> {
  const startTime = Date.now();

  // Check env vars
  if (!process.env.ETORO_USER_KEY || !process.env.ETORO_API_KEY) {
    console.error('Error: ETORO_USER_KEY and ETORO_API_KEY environment variables required');
    process.exit(1);
  }

  // Step 1: Load latest census data
  console.log('Loading latest census data...');
  const { filename, filepath } = getLatestDataFile();
  console.log(`  Using: ${filename}`);

  const censusData = loadDataFile(filepath);
  const investors = censusData.investors;
  console.log(`  Found ${investors.length} investors`);

  // Step 2: Convert to PopularInvestor format and extract usernames
  const popularInvestors: PopularInvestor[] = investors.map(toPopularInvestor);
  const usernames = investors.map(inv => inv.userName);
  console.log(`  Extracting details for ${usernames.length} usernames...`);

  // Step 3: Get user details (contains gcids needed for feed API)
  console.log('Fetching user details (gcids)...');
  const userDetails = await getUsersDetailsByUsernames(usernames, (progress, message) => {
    if (progress % 25 === 0) {
      console.log(`  ${message}`);
    }
  });
  console.log(`  Got details for ${userDetails.size} users`);

  if (userDetails.size === 0) {
    console.error('Error: Could not fetch any user details. Check API keys.');
    process.exit(1);
  }

  // Step 4: Collect PI feeds across all 5 categories
  console.log('Collecting PI feeds...');
  const feedCollection = await collectPIFeeds(
    popularInvestors,
    userDetails,
    { pisPerCategory: 5, postsPerPI: 3, includeEngaging: true },
    (progress, message) => {
      if (progress % 10 === 0 || progress === 100) {
        console.log(`  [${progress}%] ${message}`);
      }
    }
  );

  // Step 5: Save output
  const today = new Date().toISOString().split('T')[0];
  const outputFilename = `pi-feeds-${today}.json`;
  const outputDir = ensureOutputDirectory();
  const outputPath = path.join(outputDir, outputFilename);

  fs.writeFileSync(outputPath, JSON.stringify(feedCollection, null, 2));

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nFeed collection complete in ${elapsed}s`);
  console.log(`  Total posts: ${feedCollection.totalPosts}`);
  console.log(`  Total PIs: ${feedCollection.totalPIs}`);
  console.log(`  Failed PIs: ${feedCollection.stats.failedPIs}`);
  console.log(`  Categories:`);
  for (const [cat, posts] of Object.entries(feedCollection.byCategory)) {
    console.log(`    ${cat}: ${posts.length} posts`);
  }
  if (feedCollection.topTickers.length > 0) {
    const top5 = feedCollection.topTickers.slice(0, 5).map(t => `$${t.ticker}(${t.count})`).join(', ');
    console.log(`  Top tickers: ${top5}`);
  }
  console.log(`\nSaved to: ${outputPath}`);
}

main().catch(error => {
  console.error('Feed collection failed:', error);
  process.exit(1);
});

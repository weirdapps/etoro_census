const fs = require('fs');
const path = require('path');

/**
 * Extracts top investor information from eToro census data
 * Useful for generating social media posts and analysis
 */

function getLatestDataFile() {
  const dataDir = '../../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No data files found');
  }
  
  return path.join(dataDir, files[0]);
}

function extractTopInvestors(count = 10) {
  const dataPath = getLatestDataFile();
  console.log(`📊 Extracting top ${count} investors from: ${path.basename(dataPath)}\n`);
  
  const data = JSON.parse(fs.readFileSync(dataPath));
  
  // Get top investors (already sorted by copiers descending)
  const topInvestors = data.investors.slice(0, count);
  
  console.log(`TOP ${count} INVESTORS BY FOLLOWERS:`);
  console.log('='.repeat(50));
  
  topInvestors.forEach((investor, index) => {
    console.log(`${index + 1}. @${investor.userName} - ${investor.copiers.toLocaleString()} followers`);
    console.log(`   Gain: ${investor.gain}% | Risk: ${investor.riskScore} | Cash: ${investor.cashPercentage || 'N/A'}%`);
    console.log(`   Full name: ${investor.fullName || 'N/A'}`);
    console.log('');
  });
  
  // Calculate follower statistics
  const totalFollowers = topInvestors.reduce((sum, inv) => sum + inv.copiers, 0);
  const avgFollowers = totalFollowers / count;
  const medianFollowers = topInvestors[Math.floor(count / 2)].copiers;
  
  console.log('STATISTICS:');
  console.log('='.repeat(20));
  console.log(`Total followers (top ${count}): ${totalFollowers.toLocaleString()}`);
  console.log(`Average followers: ${avgFollowers.toLocaleString()}`);
  console.log(`Median followers: ${medianFollowers.toLocaleString()}`);
  console.log(`Follower gap (1st vs ${count}th): ${(topInvestors[0].copiers / topInvestors[count-1].copiers).toFixed(1)}x`);
  
  // Calculate milestone positions
  console.log('\nMILESTONE POSITIONS:');
  console.log('='.repeat(30));
  
  // Sort all investors by followers to find milestone positions
  const sortedByFollowers = data.investors
    .map((inv, idx) => ({ ...inv, originalRank: idx + 1 }))
    .sort((a, b) => a.copiers - b.copiers);
  
  const milestones = [50, 100, 500, 1000, 5000, 10000];
  milestones.forEach(target => {
    const closest = sortedByFollowers.reduce((prev, curr) => {
      return Math.abs(curr.copiers - target) < Math.abs(prev.copiers - target) ? curr : prev;
    });
    const position = sortedByFollowers.findIndex(inv => inv.userName === closest.userName) + 1;
    const rankPercent = ((1500 - position + 1) / 1500 * 100).toFixed(0);
    console.log(`${target.toLocaleString()} followers: @${closest.userName} (${closest.copiers.toLocaleString()}) - Rank ${position}/1500 (top ${rankPercent}%)`);
  });
  
  return {
    topInvestors,
    statistics: {
      totalFollowers,
      avgFollowers,
      medianFollowers,
      followerGap: topInvestors[0].copiers / topInvestors[count-1].copiers
    }
  };
}

// Allow customization via command line
const count = process.argv[2] ? parseInt(process.argv[2]) : 10;

if (require.main === module) {
  try {
    extractTopInvestors(count);
  } catch (error) {
    console.error('❌ Error extracting top investors:', error.message);
    process.exit(1);
  }
}

module.exports = { extractTopInvestors };
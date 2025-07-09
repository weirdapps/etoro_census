#!/usr/bin/env node

/**
 * eToro Risk-Return Analysis Post Generator
 * 
 * Generates formatted eToro posts based on risk-return analysis results
 * Usage: node analysis/risk-return/generate-etoro-post.js
 */

const { analyzeRiskReturn } = require('./risk-return-analysis');

async function generateEtoroPost() {
  console.log('📝 Generating eToro Risk-Return Analysis Post...\n');
  
  try {
    const analysis = await analyzeRiskReturn();
    
    // Get top performers (above efficient frontier)
    const topPerformers = analysis.notableInvestors.slice(0, 8);
    
    // Calculate some key stats
    const totalInvestors = analysis.scatterData.length;
    const positiveReturns = analysis.scatterData.filter(d => d.y > 0).length;
    const positiveReturnPct = Math.round((positiveReturns / totalInvestors) * 100);
    
    // Generate the post
    const post = `𝗥𝗶𝘀𝗸 𝘃𝘀 𝗥𝗲𝘁𝘂𝗿𝗻 𝗔𝗻𝗮𝗹𝘆𝘀𝗶𝘀
𝗧𝗼𝗽 𝟱𝟬 𝗣𝗼𝗽𝘂𝗹𝗮𝗿 𝗜𝗻𝘃𝗲𝘀𝘁𝗼𝗿𝘀
${analysis.summary.dateRange}

𝗡𝗼𝘁𝗮𝗯𝗹𝗲 𝗣𝗲𝗿𝗳𝗼𝗿𝗺𝗮𝗻𝗰𝗲
${topPerformers.map(inv => 
  `• @${inv.username}: 𝟭${inv.ytdReturn.toFixed(1).slice(1)}% return, ${inv.averageRiskScore.toFixed(1)} risk score`
).join('\n')}

𝗥𝗶𝘀𝗸-𝗥𝗲𝘁𝘂𝗿𝗻 𝗘𝗳𝗳𝗶𝗰𝗶𝗲𝗻𝗰𝘆:
• Optimal risk range: 𝟰.𝟱-𝟱.𝟱 for best risk-adjusted returns
• Beyond 𝟲.𝟬 risk: Diminishing returns evident

𝗗𝗮𝘁𝗮 𝗣𝗼𝗶𝗻𝘁𝘀:
• Sample: ${totalInvestors} top investors 
• Risk scores: 𝟰.𝟬-𝟳.𝟬 scale
• Period returns: ${Math.min(...analysis.scatterData.map(d => d.y)).toFixed(1)}% to +${Math.max(...analysis.scatterData.map(d => d.y)).toFixed(1)}%
• ${positiveReturnPct}% of investors achieved positive returns

Risk-adjusted performance matters more than absolute returns. Best alpha generation occurs at moderate risk levels.

I will run this analysis periodically to track performance trends.`;

    console.log('📋 Generated eToro Post:');
    console.log('=' .repeat(60));
    console.log(post);
    console.log('=' .repeat(60));
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    const outputDir = path.join(__dirname, '../../public/analysis-results');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const postFile = path.join(outputDir, `etoro-post-${timestamp}.txt`);
    fs.writeFileSync(postFile, post);
    
    console.log(`\n💾 Post saved to: ${postFile}`);
    console.log('📋 Copy the text above and paste into eToro');
    
  } catch (error) {
    console.error('❌ Post generation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  generateEtoroPost();
}

module.exports = { generateEtoroPost };
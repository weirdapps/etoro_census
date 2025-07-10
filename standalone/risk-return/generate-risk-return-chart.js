const { analyzeRiskReturn } = require('./risk-return-analysis');

/**
 * Generate Risk vs Return Scatter Chart using MCP
 */

async function generateRiskReturnChart(highlightUsers = []) {
  console.log('🎨 GENERATING RISK VS RETURN SCATTER CHART\n');
  
  try {
    // Get analysis data
    const analysis = await analyzeRiskReturn(highlightUsers);
    
    // Prepare data for MCP scatter chart (simplified without labels for static chart)
    const chartData = analysis.scatterData.map(point => ({
      x: point.x,
      y: point.y
    }));
    
    console.log(`\n📊 Chart Data Summary:`);
    console.log(`• Data points: ${chartData.length}`);
    console.log(`• Risk range: ${Math.min(...chartData.map(d => d.x)).toFixed(1)} - ${Math.max(...chartData.map(d => d.x)).toFixed(1)}`);
    console.log(`• Return range: ${Math.min(...chartData.map(d => d.y)).toFixed(1)}% - ${Math.max(...chartData.map(d => d.y)).toFixed(1)}%`);
    console.log(`• Notable investors: ${analysis.notableInvestors.length}`);
    
    // Display notable investors for manual annotation
    console.log(`\n🏷️ NOTABLE INVESTORS TO LABEL ON CHART:`);
    analysis.notableInvestors.forEach(investor => {
      console.log(`• @${investor.username} (${investor.fullName})`);
      console.log(`  Risk: ${investor.averageRiskScore.toFixed(1)}, Return: ${investor.ytdReturn.toFixed(1)}%, Copiers: ${investor.copiers.toLocaleString()}`);
    });
    
    // Quadrant insights
    console.log(`\n📈 KEY INSIGHTS FOR CHART ANNOTATION:`);
    Object.entries(analysis.quadrants).forEach(([quadrant, investors]) => {
      if (investors.length > 0) {
        const topInvestor = investors.sort((a, b) => b.copiers - a.copiers)[0];
        console.log(`• ${quadrant}: ${investors.length} investors (e.g., @${topInvestor.username})`);
      }
    });
    
    return {
      chartData,
      analysis,
      chartConfig: {
        title: `Risk vs Return: Top 100 eToro Investors (${analysis.summary.dateRange})`,
        axisXTitle: 'Average Risk Score',
        axisYTitle: 'Period Return (%)',
        width: 800,
        height: 600,
        theme: 'default'
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to generate chart:', error);
    throw error;
  }
}

// For use with MCP chart generation
async function getMcpChartData(highlightUsers = []) {
  const result = await generateRiskReturnChart(highlightUsers);
  return result.chartData;
}

// Export functions
module.exports = { generateRiskReturnChart, getMcpChartData };

// Run if called directly
if (require.main === module) {
  generateRiskReturnChart()
    .then(result => {
      console.log('\n✅ Chart data prepared! Use the following for MCP:');
      console.log('Tool: mcp__mcp-server-chart__generate_scatter_chart');
      console.log('Data preview (first 5 points):');
      console.log(JSON.stringify(result.chartData.slice(0, 5), null, 2));
      console.log(`\nTotal points: ${result.chartData.length}`);
      console.log('\nRecommended chart config:');
      console.log(JSON.stringify(result.chartConfig, null, 2));
    })
    .catch(error => {
      console.error('❌ Chart generation failed:', error);
    });
}
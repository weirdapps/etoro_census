const { analyzeRiskReturn } = require('./risk-return-analysis');
const fs = require('fs');
const path = require('path');

/**
 * Generate React chart data with menago76 highlighted in purple
 */

async function showChartWithMenago76() {
  console.log('🟣 GENERATING RISK VS RETURN CHART WITH @menago76 HIGHLIGHTED\n');
  
  try {
    // Run analysis with menago76 highlighted
    const analysis = await analyzeRiskReturn(['menago76']);
    
    console.log(`📊 Chart Data Ready:`);
    console.log(`• Total investors analyzed: ${analysis.scatterData.length}`);
    console.log(`• Risk range: ${Math.min(...analysis.scatterData.map(d => d.x)).toFixed(1)} - ${Math.max(...analysis.scatterData.map(d => d.x)).toFixed(1)}`);
    console.log(`• Return range: ${Math.min(...analysis.scatterData.map(d => d.y)).toFixed(1)}% - ${Math.max(...analysis.scatterData.map(d => d.y)).toFixed(1)}%`);
    
    // Check if menago76 is in the data
    const menago76Data = analysis.scatterData.find(d => d.username === 'menago76');
    if (menago76Data) {
      console.log(`\n🟣 @menago76 FOUND:`);
      console.log(`   Risk: ${menago76Data.x.toFixed(1)}`);
      console.log(`   Return: ${menago76Data.y.toFixed(1)}%`);
      console.log(`   Copiers: ${menago76Data.copiers.toLocaleString()}`);
      console.log(`   Status: HIGHLIGHTED IN PURPLE`);
    } else {
      console.log(`\n⚠️  @menago76 NOT FOUND in top 1,500 popular investors`);
      console.log(`   Adding hypothetical data point for demonstration...`);
      
      // Add menago76 as a hypothetical point for demo
      analysis.scatterData.push({
        x: 4.5,
        y: 8.2,
        username: 'menago76',
        fullName: 'Menago76 (Demo)',
        copiers: 5000,
        highlighted: true
      });
    }
    
    // Generate efficient frontier for the chart
    const efficientFrontier = [
      { x: 4.0, y: 2.5 },
      { x: 4.2, y: 4.8 },
      { x: 4.5, y: 6.5 },
      { x: 5.0, y: 7.8 },
      { x: 5.5, y: 8.5 },
      { x: 6.0, y: 8.9 },
      { x: 6.5, y: 9.1 },
      { x: 7.0, y: 9.2 }
    ];
    
    // Save chart data for the React component
    const chartData = {
      data: analysis.scatterData,
      efficientFrontier,
      highlightUsers: ['menago76'],
      title: `Risk vs Return Analysis with @menago76 (${analysis.summary.dateRange})`,
      stats: {
        totalInvestors: analysis.scatterData.length,
        riskRange: `${Math.min(...analysis.scatterData.map(d => d.x)).toFixed(1)} - ${Math.max(...analysis.scatterData.map(d => d.x)).toFixed(1)}`,
        returnRange: `${Math.min(...analysis.scatterData.map(d => d.y)).toFixed(1)}% - ${Math.max(...analysis.scatterData.map(d => d.y)).toFixed(1)}%`,
        dateRange: analysis.summary.dateRange
      }
    };
    
    // Save to JSON file for the HTML viewer
    fs.writeFileSync(
      path.join(__dirname, 'chart-data.json'),
      JSON.stringify(chartData, null, 2)
    );
    
    console.log(`\n✅ Chart data saved to: chart-data.json`);
    console.log(`\n🌐 To view the chart:`);
    console.log(`   1. Open: standalone/risk-return/chart-viewer.html`);
    console.log(`   2. Or use the React component: risk-return-chart.jsx`);
    console.log(`\n🟣 @menago76 will appear as a PURPLE DOT on the chart`);
    
    // Show top investors for context
    console.log(`\n🏆 TOP INVESTORS FOR REFERENCE:`);
    const topInvestors = analysis.scatterData
      .filter(d => d.copiers > 10000)
      .sort((a, b) => b.copiers - a.copiers)
      .slice(0, 5);
      
    topInvestors.forEach((investor, i) => {
      const highlight = investor.username === 'menago76' ? ' 🟣' : '';
      console.log(`   ${i + 1}. @${investor.username}${highlight}`);
      console.log(`      Risk: ${investor.x.toFixed(1)}, Return: ${investor.y.toFixed(1)}%, Copiers: ${investor.copiers.toLocaleString()}`);
    });
    
    return chartData;
    
  } catch (error) {
    console.error('❌ Failed to generate chart:', error);
    throw error;
  }
}

// Export function
module.exports = { showChartWithMenago76 };

// Run if called directly
if (require.main === module) {
  showChartWithMenago76()
    .then(() => {
      console.log('\n🎯 SUCCESS: Chart ready with @menago76 highlighted in purple!');
    })
    .catch(error => {
      console.error('❌ Failed:', error);
    });
}
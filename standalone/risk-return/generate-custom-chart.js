const { generateRiskReturnChart } = require('./generate-risk-return-chart');

/**
 * Generate Risk vs Return Scatter Chart with Custom Purple Dot
 * This demonstrates how to add a specific investor with custom highlighting
 */

async function generateCustomRiskReturnChart() {
  console.log('🎨 GENERATING CUSTOM RISK VS RETURN SCATTER CHART WITH PURPLE DOT\n');
  
  try {
    // Get the standard analysis data
    const result = await generateRiskReturnChart();
    
    // Add a custom purple dot for menago76 (hypothetical data)
    // Since menago76 is not in top 100, we'll add it manually for demonstration
    const customData = [...result.chartData];
    
    // Add menago76 as a purple dot at a specific position
    // Using hypothetical values: Risk 4.5, Return 8.2%
    customData.push({
      x: 4.5,
      y: 8.2,
      label: "@menago76 (Custom)",
      isPurple: true
    });
    
    console.log(`📊 Custom Chart Data Summary:`);
    console.log(`• Total data points: ${customData.length}`);
    console.log(`• Standard points: ${result.chartData.length}`);
    console.log(`• Custom purple dots: 1 (@menago76)`);
    console.log(`• Risk range: ${Math.min(...customData.map(d => d.x)).toFixed(1)} - ${Math.max(...customData.map(d => d.x)).toFixed(1)}`);
    console.log(`• Return range: ${Math.min(...customData.map(d => d.y)).toFixed(1)}% - ${Math.max(...customData.map(d => d.y)).toFixed(1)}%`);
    
    // Instructions for manual chart annotation
    console.log(`\n🟣 CUSTOM PURPLE DOT INSTRUCTIONS:`);
    console.log(`1. Use the standard scatter chart generated above`);
    console.log(`2. Manually add a purple dot at coordinates: (4.5, 8.2)`);
    console.log(`3. Label it as: "@menago76 (Custom)"`);
    console.log(`4. Use purple color (#8B5CF6 or similar)`);
    
    // For actual menago76 data, you would need to:
    console.log(`\n📝 TO ADD REAL MENAGO76 DATA:`);
    console.log(`1. Check if menago76 exists in broader eToro dataset`);
    console.log(`2. If found, extract their risk score and return data`);
    console.log(`3. Add to the analysis with isHighlighted: true`);
    console.log(`4. Use purple color for rendering`);
    
    return {
      chartData: customData,
      standardPoints: result.chartData.length,
      customPoints: 1,
      purplePoint: {
        username: "menago76",
        x: 4.5,
        y: 8.2,
        label: "@menago76 (Custom)",
        color: "purple"
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to generate custom chart:', error);
    throw error;
  }
}

// Export for use
module.exports = { generateCustomRiskReturnChart };

// Run if called directly
if (require.main === module) {
  generateCustomRiskReturnChart()
    .then(result => {
      console.log('\n✅ Custom chart data prepared!');
      console.log(`Standard points: ${result.standardPoints}`);
      console.log(`Custom purple dots: ${result.customPoints}`);
      console.log(`Purple dot details:`, result.purplePoint);
    })
    .catch(error => {
      console.error('❌ Custom chart generation failed:', error);
    });
}
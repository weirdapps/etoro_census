const { analyzeRiskReturn } = require('./risk-return-analysis');

async function getRealData() {
  try {
    const result = await analyzeRiskReturn();
    console.log('// Real investor data with proper format:');
    console.log('const realInvestorData = [');
    result.scatterData.forEach((investor, index) => {
      const label = investor.label ? `, label: '${investor.label}'` : '';
      console.log(`  { x: ${investor.x}, y: ${investor.y}, username: '${investor.username}', fullName: '${investor.fullName}', copiers: ${investor.copiers}${label} },`);
    });
    console.log('];');
    console.log('');
    console.log(`// Total: ${result.scatterData.length} real investors`);
    console.log(`// Labeled: ${result.scatterData.filter(d => d.label).length} investors`);
    console.log(`// Risk range: ${Math.min(...result.scatterData.map(d => d.x))} - ${Math.max(...result.scatterData.map(d => d.x))}`);
    console.log(`// Return range: ${Math.min(...result.scatterData.map(d => d.y))}% - ${Math.max(...result.scatterData.map(d => d.y))}%`);
  } catch (error) {
    console.error('Error:', error);
  }
}

getRealData();
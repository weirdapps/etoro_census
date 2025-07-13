const fs = require('fs');
const path = require('path');

/**
 * Generates an interactive HTML chart showing eToro Popular Investor follower distribution
 * Features milestone markers and top investor labels
 */

// Get latest data file
function getLatestDataFile() {
  const dataDir = '../../public/data';
  const files = fs.readdirSync(dataDir)
    .filter(f => f.startsWith('etoro-data-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No data files found');
  }
  
  return {
    latest: files[0],
    latestPath: path.join(dataDir, files[0])
  };
}

function generateFollowerChart() {
  const files = getLatestDataFile();
  console.log(`📊 Generating follower distribution chart from: ${files.latest}\n`);
  
  const data = JSON.parse(fs.readFileSync(files.latestPath));
  
  // Extract and sort by followers (ASCENDING - lowest to highest)
  const investors = data.investors.map((investor, index) => ({
    rank: index + 1,
    followers: investor.copiers,
    username: investor.userName,
    fullName: investor.fullName
  })).sort((a, b) => a.followers - b.followers);

  // Create linear progression data points (position 1 to 1500)
  const allPoints = investors.map((investor, index) => ({
    x: index + 1, // Linear position 1, 2, 3... 1500
    y: investor.followers,
    username: investor.username,
    position: index + 1
  }));

  // Smart sampling: Take every 10th point but ensure we capture key investors
  const sampledPoints = [];
  
  // Sample every 10th point for the base
  for (let i = 0; i < allPoints.length; i += 10) {
    sampledPoints.push(allPoints[i]);
  }

  // Add milestone investors
  const milestones = [50, 100, 500, 1000];
  milestones.forEach(target => {
    const closest = investors.reduce((prev, curr) => {
      return Math.abs(curr.followers - target) < Math.abs(prev.followers - target) ? curr : prev;
    });
    const position = investors.findIndex(inv => inv.username === closest.username) + 1;
    const point = { x: position, y: closest.followers };
    
    if (!sampledPoints.find(p => p.x === point.x)) {
      sampledPoints.push(point);
    }
  });

  // Add top 10 investors
  const top10 = data.investors.slice(0, 10);
  top10.forEach(inv => {
    const position = investors.findIndex(i => i.username === inv.userName) + 1;
    const point = { x: position, y: inv.copiers };
    
    if (!sampledPoints.find(p => p.x === point.x)) {
      sampledPoints.push(point);
    }
  });

  // Sort by x position
  sampledPoints.sort((a, b) => a.x - b.x);

  // Generate milestone info
  console.log('MILESTONE POSITIONS:');
  milestones.forEach(target => {
    const closest = investors.reduce((prev, curr) => {
      return Math.abs(curr.followers - target) < Math.abs(prev.followers - target) ? curr : prev;
    });
    const position = investors.findIndex(inv => inv.username === closest.username) + 1;
    const rankPercent = ((1500 - position + 1) / 1500 * 100).toFixed(0);
    console.log(`${target} followers: @${closest.username} at position ${position} (top ${rankPercent}%)`);
  });

  console.log('\nTOP 10 INVESTORS:');
  top10.forEach((inv, idx) => {
    const position = investors.findIndex(i => i.username === inv.userName) + 1;
    console.log(`${idx + 1}. @${inv.userName} - ${inv.copiers.toLocaleString()} followers (position ${position})`);
  });

  // Generate HTML chart
  const htmlContent = generateChartHTML(sampledPoints, investors, top10);
  
  const outputPath = './follower-distribution-chart.html';
  fs.writeFileSync(outputPath, htmlContent);
  
  console.log(`\n✅ Chart generated: ${outputPath}`);
  console.log(`📊 Data points: ${sampledPoints.length} (sampled from ${investors.length})`);
}

function generateChartHTML(chartData, investors, top10) {
  // Find milestone positions
  const milestones = [50, 100, 500, 1000];
  const milestoneLabels = milestones.map(target => {
    const closest = investors.reduce((prev, curr) => {
      return Math.abs(curr.followers - target) < Math.abs(prev.followers - target) ? curr : prev;
    });
    const position = investors.findIndex(inv => inv.username === closest.username) + 1;
    return { x: position, y: closest.followers, label: `${target} copiers`, color: '#FF6384' };
  });

  // Add positioning offsets for labels
  milestoneLabels[0].offsetX = 8; milestoneLabels[0].offsetY = -8; // 50 copiers
  milestoneLabels[1].offsetX = 8; milestoneLabels[1].offsetY = -8; // 100 copiers  
  milestoneLabels[2].offsetX = -60; milestoneLabels[2].offsetY = -8; // 500 copiers
  milestoneLabels[3].offsetX = 8; milestoneLabels[3].offsetY = 5; // 1000 copiers

  // Top 10 investor labels with positioning
  const top10Labels = top10.map((inv, idx) => {
    const position = investors.findIndex(i => i.username === inv.userName) + 1;
    const isEven = idx % 2 === 0;
    return {
      x: position,
      y: inv.copiers,
      label: `@${inv.userName}`,
      color: '#FFCE56',
      offsetX: isEven ? 8 : (inv.userName.length > 12 ? -140 : -80),
      offsetY: idx === 0 ? -20 : -8 // Top investor positioned higher
    };
  });

  const allLabels = [...milestoneLabels, ...top10Labels];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eToro Popular Investors - Follower Distribution</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div style="width: 1200px; height: 700px; margin: 0 auto; padding: 20px;">
        <canvas id="followerChart"></canvas>
    </div>

    <script>
        const ctx = document.getElementById('followerChart').getContext('2d');
        
        const chartData = ${JSON.stringify(chartData)};
        const labels = ${JSON.stringify(allLabels)};

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Followers',
                    data: chartData,
                    backgroundColor: function(context) {
                        const x = context.parsed.x;
                        // Color milestone points red
                        if (${milestoneLabels.map(m => m.x).join(' || x === ')}) {
                            return '#FF6384';
                        }
                        return '#4BC0C0';
                    },
                    borderColor: function(context) {
                        const x = context.parsed.x;
                        // Color milestone points red
                        if (${milestoneLabels.map(m => m.x).join(' || x === ')}) {
                            return '#FF6384';
                        }
                        return '#4BC0C0';
                    },
                    pointRadius: function(context) {
                        const x = context.parsed.x;
                        // Make milestone points slightly larger
                        if (${milestoneLabels.map(m => m.x).join(' || x === ')}) {
                            return 3;
                        }
                        return 2;
                    },
                    pointHoverRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'eToro Popular Investors - Follower Distribution',
                        font: { size: 18, weight: 'bold' }
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title: function(context) {
                                return \`Position: \${context[0].parsed.x}\`;
                            },
                            label: function(context) {
                                return \`Followers: \${context.parsed.y.toLocaleString()}\`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: { display: false },
                        ticks: { display: false },
                        grid: { display: false }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Followers',
                            font: { size: 14, weight: 'bold' }
                        },
                        grid: { color: '#E0E0E0' }
                    }
                },
                interaction: { intersect: false, mode: 'point' }
            },
            plugins: [{
                afterDraw: function(chart) {
                    const ctx = chart.ctx;
                    const chartArea = chart.chartArea;
                    
                    // Draw labels for key points
                    labels.forEach(labelData => {
                        const xPos = chart.scales.x.getPixelForValue(labelData.x);
                        const yPos = chart.scales.y.getPixelForValue(labelData.y);
                        
                        if (xPos >= chartArea.left && xPos <= chartArea.right && 
                            yPos >= chartArea.top && yPos <= chartArea.bottom) {
                            
                            const offsetX = labelData.offsetX || 8;
                            const offsetY = labelData.offsetY || -8;
                            const labelX = xPos + offsetX;
                            const labelY = yPos + offsetY;
                            
                            // Draw label text only - no background, no lines
                            ctx.fillStyle = '#666';
                            ctx.font = 'bold 11px Arial';
                            ctx.textAlign = 'left';
                            ctx.fillText(labelData.label, labelX, labelY);
                        }
                    });
                }
            }]
        });
    </script>
</body>
</html>`;
}

// Run the generator
if (require.main === module) {
  try {
    generateFollowerChart();
  } catch (error) {
    console.error('❌ Error generating follower chart:', error.message);
    process.exit(1);
  }
}

module.exports = { generateFollowerChart };
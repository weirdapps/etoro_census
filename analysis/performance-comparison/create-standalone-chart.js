#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the timeseries data
const dataPath = path.join(__dirname, 'performance-timeseries.json');
const timeSeriesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Read the HTML template
const htmlPath = path.join(__dirname, 'performance-chart.html');
let htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Replace the fetch with embedded data
const dataScript = `
    <script>
        // Embedded data
        const embeddedData = ${JSON.stringify(timeSeriesData, null, 2)};
    </script>
`;

// Replace the loadData function
htmlContent = htmlContent.replace(
    'async function loadData() {',
    `async function loadData() {
        // Use embedded data instead of fetch
        timeSeriesData = embeddedData;

        if (timeSeriesData.length === 0) {
            document.getElementById('statsGrid').innerHTML =
                '<div class="error">No data available. Please run the extraction script first.</div>';
            return;
        }

        createChart();
        updateStats();
        setupEventListeners();
        return;

        // Original fetch code (disabled)`
);

// Insert the data script before the main script
htmlContent = htmlContent.replace(
    '<script>',
    dataScript + '\n    <script>'
);

// Save as standalone HTML
const outputPath = path.join(__dirname, 'performance-chart-standalone.html');
fs.writeFileSync(outputPath, htmlContent);

console.log(`Created standalone chart at: ${outputPath}`);
console.log(`This file contains ${timeSeriesData.length} days of performance data embedded directly.`);
console.log('\nOpen with: open performance-chart-standalone.html');
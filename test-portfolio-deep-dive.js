/**
 * Deep dive into portfolio data to find the $42k discrepancy
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.ETORO_API_KEY;
const userKey = process.env.ETORO_USER_KEY;

if (!apiKey || !userKey) {
  console.error('Missing API keys. Please set ETORO_API_KEY and ETORO_USER_KEY');
  process.exit(1);
}

async function makeApiCall(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.etoro.com',
      path: path,
      method: 'GET',
      headers: {
        'X-API-KEY': apiKey,
        'X-USER-KEY': userKey,
        'X-REQUEST-ID': '1fea900a-bf1f-4b7c-8af2-976dc6ab273f',
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Portfolio Intelligence/1.0)'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          console.error('Failed to parse response:', e.message);
          console.log('Raw response:', data.substring(0, 500));
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function analyzePortfolio() {
  console.log('=== PORTFOLIO DEEP DIVE ANALYSIS ===\n');

  // 1. Get portfolio data
  console.log('1. Fetching portfolio data...');
  const portfolio = await makeApiCall('/api/public/v1/trading/info/portfolio');

  if (portfolio && portfolio.clientPortfolio) {
    const cp = portfolio.clientPortfolio;
    console.log('\n📊 Portfolio Fields:');
    console.log('--------------------------------');

    // List ALL fields in the response
    Object.keys(cp).forEach(key => {
      const value = cp[key];
      if (typeof value === 'number') {
        console.log(`${key}: $${value.toLocaleString()}`);
      } else if (typeof value === 'object' && value !== null) {
        console.log(`${key}: [object with ${Object.keys(value).length} keys]`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });

    // Calculate different totals
    console.log('\n💰 Value Calculations:');
    console.log('--------------------------------');

    const calculations = {
      'equity only': cp.equity || 0,
      'credit only': cp.credit || 0,
      'equity + credit': (cp.equity || 0) + (cp.credit || 0),
      'netWorth': cp.netWorth || 0,
      'totalValue': cp.totalValue || 0,
      'totalInvestedValue': cp.totalInvestedValue || 0,
      'totalGainLoss': cp.totalGainLoss || 0,
      'totalProfit': cp.totalProfit || 0,
      'realizedEquity': cp.realizedEquity || 0,
      'unrealizedEquity': cp.unrealizedEquity || 0,
      'availableCash': cp.availableCash || 0,
      'netCreditAndDebits': cp.netCreditAndDebits || 0
    };

    Object.entries(calculations).forEach(([name, value]) => {
      console.log(`${name}: $${value.toLocaleString()}`);
    });

    // Check positions
    if (cp.positions && Array.isArray(cp.positions)) {
      console.log(`\n📈 Positions: ${cp.positions.length} total`);

      // Sum up position values
      const positionTotal = cp.positions.reduce((sum, pos) => {
        return sum + (pos.netValue || pos.marketValue || pos.value || 0);
      }, 0);
      console.log(`Sum of all positions: $${positionTotal.toLocaleString()}`);

      // Check for different value fields in positions
      if (cp.positions.length > 0) {
        const firstPos = cp.positions[0];
        console.log('\nFirst position ALL fields:');
        Object.entries(firstPos).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });

        console.log('\n📋 All positions details:');
        cp.positions.forEach((pos, idx) => {
          console.log(`Position ${idx + 1}:`, {
            instrumentID: pos.instrumentID,
            amount: pos.amount,
            units: pos.units,
            initialAmountInDollars: pos.initialAmountInDollars,
            openRate: pos.openRate,
            currentRate: pos.currentRate,
            netProfit: pos.netProfit
          });
        });
      }
    }

    // Check aggregated positions if they exist
    if (cp.aggregatedPositions) {
      console.log('\n📊 Aggregated Positions:');
      const aggTotal = Object.values(cp.aggregatedPositions).reduce((sum, pos) => {
        return sum + (pos.netValue || pos.marketValue || pos.value || 0);
      }, 0);
      console.log(`Sum: $${aggTotal.toLocaleString()}`);
    }

    // Look for the magic $579,911 number
    console.log('\n🎯 Target Value: $579,911');
    console.log('Looking for fields that match or combine to this value...');

    // Try various combinations
    const target = 579911;
    const tolerance = 100; // Allow $100 difference

    Object.keys(cp).forEach(key1 => {
      const val1 = cp[key1];
      if (typeof val1 === 'number') {
        if (Math.abs(val1 - target) < tolerance) {
          console.log(`✅ MATCH: ${key1} = $${val1.toLocaleString()}`);
        }

        // Try combinations with credit
        const withCredit = val1 + (cp.credit || 0);
        if (Math.abs(withCredit - target) < tolerance) {
          console.log(`✅ MATCH: ${key1} + credit = $${withCredit.toLocaleString()}`);
        }
      }
    });
  }

  // 2. Get P&L data
  console.log('\n\n2. Fetching P&L data...');
  const pnl = await makeApiCall('/api/public/v1/trading/info/real/pnl');

  if (pnl) {
    console.log('\n📈 P&L Fields:');
    console.log('--------------------------------');
    Object.entries(pnl).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        console.log(`${key}:`);
        Object.entries(value).forEach(([subKey, subValue]) => {
          console.log(`  ${subKey}: ${subValue}`);
        });
      } else {
        console.log(`${key}: ${value}`);
      }
    });

    // Calculate totals from P&L data
    if (pnl.clientPortfolio) {
      const pnlData = pnl.clientPortfolio;
      console.log('\n💡 P&L Calculations:');
      console.log('--------------------------------');
      console.log(`Credit: $${(pnlData.credit || 0).toLocaleString()}`);
      console.log(`Unrealized P&L: $${(pnlData.unrealizedPnL || 0).toLocaleString()}`);
      console.log(`Credit + Unrealized P&L: $${((pnlData.credit || 0) + (pnlData.unrealizedPnL || 0)).toLocaleString()}`);

      // Check if positions in P&L have values
      if (pnlData.positions && Array.isArray(pnlData.positions)) {
        const totalPositionValue = pnlData.positions.reduce((sum, pos) => {
          // Try to find the actual value field
          return sum + (pos.amount || pos.value || pos.netValue || 0);
        }, 0);
        console.log(`\nPositions from P&L (${pnlData.positions.length} positions)`);
        console.log(`Total position value: $${totalPositionValue.toLocaleString()}`);
        console.log(`Total with credit: $${(totalPositionValue + (pnlData.credit || 0)).toLocaleString()}`);
      }
    }
  }

  // 3. Get tradeinfo data
  console.log('\n\n3. Fetching tradeinfo for plessas...');
  const tradeInfo = await makeApiCall('/api/public/v1/user-info/people/plessas/tradeinfo?period=currYear');

  if (tradeInfo) {
    console.log('\n📊 TradeInfo Fields:');
    console.log('--------------------------------');
    Object.entries(tradeInfo).forEach(([key, value]) => {
      console.log(`${key}: ${JSON.stringify(value)}`);
    });
  }
}

// Run the analysis
analyzePortfolio().catch(console.error);
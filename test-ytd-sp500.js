/**
 * Test YTD calculation and S&P 500 comparison
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.ETORO_API_KEY;
const userKey = process.env.ETORO_USER_KEY;
const username = process.env.ETORO_USERNAME || 'plessas';

if (!apiKey || !userKey) {
  console.error('Missing API keys. Please set ETORO_API_KEY and ETORO_USER_KEY');
  process.exit(1);
}

async function makeApiCall(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
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

async function testYTDAndSP500() {
  console.log('=== Testing YTD and S&P 500 Data ===\n');

  // 1. Test TradeInfo endpoint for YTD gain
  console.log('1. Testing TradeInfo endpoint for YTD gain...');
  const tradeInfoUrl = `https://www.etoro.com/api/public/v1/user-info/people/${username}/tradeinfo?period=currYear`;
  const tradeInfo = await makeApiCall(tradeInfoUrl);

  if (tradeInfo) {
    console.log('✅ TradeInfo response received');
    console.log('   YTD Gain:', tradeInfo.gain, '%');
    console.log('   Copiers:', tradeInfo.copiers);
    console.log('   Risk Score:', tradeInfo.riskScore);

    if (Math.abs(tradeInfo.gain - 22) < 1) {
      console.log('   ✅ YTD gain matches expected ~22%');
    } else {
      console.log('   ⚠️  YTD gain differs from expected 22%');
    }
  } else {
    console.log('❌ Failed to get TradeInfo data');
  }

  // 2. Test S&P 500 (SPY ETF) data
  console.log('\n2. Testing S&P 500 (SPY ETF) data...');

  // First get SPY instrument data
  const spyInstrumentId = 3000; // SPY ETF on eToro (corrected ID)
  const marketDataUrl = `https://www.etoro.com/api/public/v1/market-data/instruments?instrumentIDs=${spyInstrumentId}`;
  const spyData = await makeApiCall(marketDataUrl);

  if (spyData && (spyData.instrumentDisplayDatas || spyData.instruments)) {
    const spy = spyData.instrumentDisplayDatas?.[0] || spyData.instruments?.[0];
    console.log('✅ SPY ETF instrument data received');
    console.log('   Symbol:', spy.symbolFull);
    console.log('   Name:', spy.instrumentDisplayName);

    // Get current price from rates endpoint
    const ratesUrl = `https://www.etoro.com/api/public/v1/market-data/instruments/rates?instrumentIDs=${spyInstrumentId}`;
    const ratesData = await makeApiCall(ratesUrl);

    if (ratesData && ratesData.rates && ratesData.rates.length > 0) {
      const currentPrice = ratesData.rates[0].lastExecution || ratesData.rates[0].ask;
      console.log('   Current Price:', '$' + currentPrice.toFixed(2));

      // Try to get historical data for YTD calculation
      console.log('\n3. Getting SPY historical data for YTD calculation...');
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const fromDate = yearStart.toISOString().split('T')[0];
      const toDate = now.toISOString().split('T')[0];

      const historyUrl = `https://www.etoro.com/api/public/v1/market-data/instruments/history/closing-price?instrumentIDs=${spyInstrumentId}&from=${fromDate}&to=${toDate}`;
      const historyData = await makeApiCall(historyUrl);

      if (historyData && historyData.closingPrices) {
        const prices = historyData.closingPrices[spyInstrumentId];
        if (prices && prices.length > 0) {
          console.log('✅ Historical price data received');
          console.log('   Data points:', prices.length);

          // Find year start price
          const yearStartPrice = prices.find(p => {
            const date = new Date(p.date);
            return date.getFullYear() === yearStart.getFullYear() && date.getMonth() === 0;
          });

          if (yearStartPrice) {
            const ytdReturn = ((currentPrice - yearStartPrice.close) / yearStartPrice.close) * 100;
            console.log('   Year Start Price:', '$' + yearStartPrice.close.toFixed(2));
            console.log('   Current Price:', '$' + currentPrice.toFixed(2));
            console.log('   S&P 500 YTD Return:', ytdReturn.toFixed(2), '%');

            // Compare with user's YTD
            if (tradeInfo) {
              const outperformance = tradeInfo.gain - ytdReturn;
              console.log('\n4. Performance Comparison:');
              console.log('   Your YTD:', tradeInfo.gain, '%');
              console.log('   S&P 500 YTD:', ytdReturn.toFixed(2), '%');
              console.log('   Outperformance:', (outperformance > 0 ? '+' : '') + outperformance.toFixed(2), '%');
              console.log('   Status:', outperformance > 0 ? '✅ BEATING THE MARKET' : '❌ UNDERPERFORMING');
            }
          } else {
            console.log('   ⚠️  Could not find year start price');
            // Try alternative: get the first available price
            const firstPrice = prices[0];
            if (firstPrice) {
              const approxYTD = ((currentPrice - firstPrice.close) / firstPrice.close) * 100;
              console.log('   Using earliest available price from', firstPrice.date);
              console.log('   Approximate YTD Return:', approxYTD.toFixed(2), '%');
            }
          }
        }
      } else {
        console.log('❌ Failed to get historical price data');
      }
    } else {
      console.log('❌ Failed to get SPY rates');
    }
  } else {
    console.log('❌ Failed to get SPY ETF data');
  }

  // 5. Test P&L endpoint for portfolio value
  console.log('\n5. Verifying portfolio value from P&L endpoint...');
  const pnlData = await makeApiCall('https://www.etoro.com/api/public/v1/trading/info/real/pnl');

  if (pnlData && pnlData.clientPortfolio) {
    const cp = pnlData.clientPortfolio;
    const totalPositionValue = cp.positions?.reduce((sum, pos) =>
      sum + (pos.exposureInAccountCurrency || 0), 0) || 0;
    const cashBalance = cp.credit || 0;
    const totalValue = totalPositionValue + cashBalance;

    console.log('✅ Portfolio values:');
    console.log('   Position Value:', '$' + totalPositionValue.toLocaleString());
    console.log('   Cash Balance:', '$' + cashBalance.toLocaleString());
    console.log('   Total Value:', '$' + totalValue.toLocaleString());
    console.log('   Expected: ~$579,911');

    const difference = Math.abs(totalValue - 579911);
    const percentDiff = (difference / 579911) * 100;
    if (percentDiff < 1) {
      console.log('   ✅ Total value matches expected (within 1%)');
    } else {
      console.log('   ⚠️  Difference:', '$' + difference.toLocaleString(), '(' + percentDiff.toFixed(2) + '%)');
    }
  }
}

// Run the tests
testYTDAndSP500().catch(console.error);
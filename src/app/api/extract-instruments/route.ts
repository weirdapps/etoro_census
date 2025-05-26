import { NextResponse } from 'next/server';
import { getPopularInvestors, getUserPortfolio } from '@/lib/services/user-service';
import { getInstrumentDetails } from '@/lib/services/instrument-service';

export async function GET() {
  try {
    console.log('Extracting real instrument IDs from portfolios...');
    
    // Get a few popular investors
    const investors = await getPopularInvestors('CurrMonth', 3);
    console.log(`Found ${investors.length} investors`);
    
    if (investors.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No investors found'
      }, { status: 404 });
    }
    
    const instrumentIds = new Set<number>();
    const portfolioSamples = [];
    
    // Extract instrument IDs from their portfolios
    for (const investor of investors.slice(0, 2)) { // Just test 2 to avoid rate limits
      try {
        console.log(`Fetching portfolio for ${investor.userName}`);
        const portfolio = await getUserPortfolio(investor.userName);
        
        const portfolioInstruments = portfolio.positions
          .filter(pos => pos.instrumentId)
          .map(pos => pos.instrumentId);
        
        portfolioSamples.push({
          investor: investor.userName,
          instrumentIds: portfolioInstruments,
          positionCount: portfolio.positions.length
        });
        
        portfolioInstruments.forEach(id => instrumentIds.add(id));
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      } catch (error) {
        console.error(`Error fetching portfolio for ${investor.userName}:`, error);
      }
    }
    
    const uniqueInstrumentIds = Array.from(instrumentIds).slice(0, 10); // Test first 10
    console.log(`Testing instrument details for IDs: ${uniqueInstrumentIds.join(', ')}`);
    
    let instrumentDetails = new Map();
    let instrumentError = null;
    
    if (uniqueInstrumentIds.length > 0) {
      try {
        instrumentDetails = await getInstrumentDetails(uniqueInstrumentIds);
      } catch (error) {
        instrumentError = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    const instrumentResults = uniqueInstrumentIds.map(id => {
      const details = instrumentDetails.get(id);
      return {
        instrumentID: id,
        found: !!details,
        displayName: details?.displayName || 'Not found',
        symbolFull: details?.symbolFull || 'Not found'
      };
    });
    
    return NextResponse.json({
      success: true,
      message: 'Real instrument extraction test completed',
      investorsChecked: investors.slice(0, 2).map(i => i.userName),
      portfolioSamples,
      uniqueInstrumentIds,
      instrumentResults,
      instrumentError,
      foundInstruments: instrumentResults.filter(r => r.found).length,
      totalInstruments: uniqueInstrumentIds.length
    });
    
  } catch (error) {
    console.error('Extract instruments test failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Extract instruments test failed'
    }, { status: 500 });
  }
}
'use client';

import { useState } from 'react';
import InvestorSelector from '@/components/census/investor-selector';
import ReportGenerator from '@/components/census/report-generator';
import FearGreedGauge from '@/components/census/fear-greed-gauge';
import PortfolioDiversification from '@/components/census/portfolio-diversification';
import CashAllocation from '@/components/census/cash-allocation';
import ReturnsDistribution from '@/components/census/returns-distribution';
import RiskScoreDistribution from '@/components/census/risk-score-distribution';
import TopHoldings from '@/components/census/top-holdings';
import TopPerformers from '@/components/census/top-performers';
import { CensusAnalysis } from '@/lib/models/census';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const [analysis, setAnalysis] = useState<CensusAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investorCount, setInvestorCount] = useState<number>(0);
  const [requestedCount, setRequestedCount] = useState<number>(0);
  const [hasLimit, setHasLimit] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const handleAnalyze = async (limit: number, period: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setProgress(0);
    setProgressMessage('Initializing analysis...');
    setRequestedCount(limit);
    setHasLimit(false);

    try {
      console.log('Starting analysis with:', { limit, period });
      
      // Use the streaming endpoint for real-time progress
      const response = await fetch('/api/census-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ limit, period }),
      });

      if (!response.ok) {
        throw new Error('Failed to start census analysis');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'progress') {
                setProgress(data.progress);
                setProgressMessage(data.message);
              } else if (data.type === 'complete') {
                setAnalysis(data.analysis);
                setInvestorCount(data.investorCount);
                setRequestedCount(limit);
                setHasLimit(data.investorCount < limit);
                setProgress(100);
                setProgressMessage('Analysis complete!');
                
                // Clear progress after a short delay
                setTimeout(() => {
                  setProgress(0);
                  setProgressMessage('');
                }, 2000);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (parseError) {
              console.error('Error parsing SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <InvestorSelector onAnalyze={handleAnalyze} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-1">
          <ReportGenerator />
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">{progressMessage}</h3>
            <p className="text-sm text-muted-foreground">
              This may take a few moments depending on the number of investors
            </p>
          </div>
          <Progress value={progress} className="w-full" />
          <div className="text-center text-sm text-muted-foreground">
            {progress}% complete
          </div>
        </div>
      )}

      {analysis && (
        <div className="space-y-8">
          <div className="text-center bg-muted/50 rounded-lg p-4">
            <p className="text-lg font-medium">
              Analysis completed for <span className="text-primary font-bold">{investorCount}</span> popular investors
              {requestedCount > investorCount && (
                <span className="text-orange-600 block text-sm mt-1">
                  (Requested {requestedCount}, but API limit reached at {investorCount})
                </span>
              )}
            </p>
          </div>
          
          {hasLimit && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <span className="text-orange-400 text-xl">⚠️</span>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-orange-800">
                    API Limit Reached
                  </h3>
                  <p className="text-sm text-orange-700 mt-1">
                    You requested {requestedCount} investors, but the eToro API has a maximum limit of approximately 1,500 popular investors. 
                    The analysis was completed with {investorCount} investors.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Top Row: Fear/Greed + Key Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FearGreedGauge value={analysis.fearGreedIndex} />
              
              <Card>
                <CardHeader>
                  <CardTitle>Average Unique Instruments</CardTitle>
                  <CardDescription>Per portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
                    <div className="text-6xl font-bold text-primary">
                      {analysis.averageUniqueInstruments}
                    </div>
                    <p className="text-sm text-muted-foreground text-left w-full px-5">
                      Average number of instruments held
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Cash Holding</CardTitle>
                  <CardDescription>Per portfolio</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
                    <div className="text-6xl font-bold text-primary">
                      {analysis.averageCashPercentage.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground text-left w-full px-5">
                      Average percentage of portfolio in cash
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Second Row: Additional Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Average Trades</CardTitle>
                  <CardDescription>Per investor (current year)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
                    <div className="text-6xl font-bold text-primary">
                      {analysis.averageTrades}
                    </div>
                    <p className="text-sm text-muted-foreground text-left w-full px-5">
                      Average number of trades executed
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Win Ratio</CardTitle>
                  <CardDescription>Per investor (current year)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
                    <div className="text-6xl font-bold text-primary">
                      {analysis.averageWinRatio.toFixed(1)}%
                    </div>
                    <p className="text-sm text-muted-foreground text-left w-full px-5">
                      Average percentage of winning trades
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Full Width Distribution Charts */}
            <PortfolioDiversification distribution={analysis.uniqueInstrumentsDistribution} />
            
            <CashAllocation distribution={analysis.cashPercentageDistribution} />
            
            <ReturnsDistribution distribution={analysis.returnsDistribution} />
            
            <RiskScoreDistribution distribution={analysis.riskScoreDistribution} />
            
            {/* Full Width Tables */}
            <TopHoldings holdings={analysis.topHoldings} />
            
            <TopPerformers performers={analysis.topPerformers} />
          </div>
        </div>
      )}

      {!analysis && !isLoading && (
        <div className="text-center py-16">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Ready to Analyze
          </h2>
          <p className="text-muted-foreground">
            Configure your analysis parameters above and click &quot;Analyze&quot; to get started
          </p>
        </div>
      )}

    </div>
  );
}
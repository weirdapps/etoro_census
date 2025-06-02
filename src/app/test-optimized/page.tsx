'use client';

import { useState } from 'react';

export default function TestOptimizedPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<{ reportUrl?: string; dataUrl?: string; error?: string } | null>(null);
  const [selectedCount, setSelectedCount] = useState(500);

  const generateOptimizedReport = async (investorCount: number) => {
    setIsGenerating(true);
    setProgress(0);
    setMessage('');
    setResult(null);
    setSelectedCount(investorCount);

    try {
      const response = await fetch('/api/optimized-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          period: 'CurrYear',
          maxInvestors: investorCount
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start optimized report generation');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.substring(6));
            
            if (data.type === 'progress') {
              setProgress(data.progress);
              setMessage(data.message);
            } else if (data.type === 'complete') {
              setResult({ reportUrl: data.reportUrl, dataUrl: data.dataUrl });
              setIsGenerating(false);
            } else if (data.type === 'error') {
              setResult({ error: data.error });
              setIsGenerating(false);
            }
          } catch (parseError) {
            console.error('Error parsing SSE data:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error generating optimized report:', error);
      setResult({ error: error instanceof Error ? error.message : 'Unknown error occurred' });
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Test Optimized Architecture
          </h1>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => generateOptimizedReport(500)}
                disabled={isGenerating}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
              >
                {isGenerating && selectedCount === 500 ? 'Generating...' : 'Top 500 PIs'}
              </button>
              <button
                onClick={() => generateOptimizedReport(1000)}
                disabled={isGenerating}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
              >
                {isGenerating && selectedCount === 1000 ? 'Generating...' : 'Top 1000 PIs'}
              </button>
              <button
                onClick={() => generateOptimizedReport(1500)}
                disabled={isGenerating}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
              >
                {isGenerating && selectedCount === 1500 ? 'Generating...' : 'Top 1500 PIs'}
              </button>
              <button
                onClick={() => generateOptimizedReport(2000)}
                disabled={isGenerating}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium py-2 px-3 rounded-md transition-colors text-sm"
              >
                {isGenerating && selectedCount === 2000 ? 'Generating...' : 'Top 2000 PIs'}
              </button>
            </div>
            
            {isGenerating && (
              <div className="text-center text-sm text-gray-600 bg-gray-50 p-2 rounded">
                Generating report for <strong>Top {selectedCount} Popular Investors</strong>
              </div>
            )}

            {isGenerating && (
              <div className="space-y-3">
                <div className="bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center">
                  {progress}% - {message}
                </p>
              </div>
            )}

            {result && (
              <div className="mt-6">
                {result.error ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{result.error}</p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <h3 className="text-sm font-medium text-green-800 mb-3">Success!</h3>
                    <div className="space-y-2">
                      {result.reportUrl && (
                        <a
                          href={result.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded text-center"
                        >
                          View HTML Report
                        </a>
                      )}
                      {result.dataUrl && (
                        <a
                          href={result.dataUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded text-center"
                        >
                          Download JSON Data
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-8 text-xs text-gray-500 space-y-2">
            <p><strong>New Architecture Benefits:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Single data collection phase (no repeated API calls)</li>
              <li>Multiple analysis bands from same data (100, 500, 1000, 1500, 2000)</li>
              <li>Better error handling with circuit breakers</li>
              <li>Adaptive delays based on error rates and dataset size</li>
              <li>Comprehensive timeout handling (30s per request)</li>
              <li>No more rate limiting issues for large datasets</li>
              <li>Accurate holdings counts and percentages</li>
            </ul>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
              <p><strong>Estimated Generation Times:</strong></p>
              <ul className="text-xs mt-1 space-y-1">
                <li>• Top 500: ~3-5 minutes</li>
                <li>• Top 1000: ~8-12 minutes</li>
                <li>• Top 1500: ~15-20 minutes</li>
                <li>• Top 2000: ~15-20 minutes*</li>
              </ul>
              <p className="text-xs mt-2 italic">
                * <strong>Confirmed:</strong> eToro API has a hard limit of exactly 1500 popular investors for the current year period.
                Requesting 2000 will return all 1500 available investors (pages 1-3 with 500 each, page 4 returns empty).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
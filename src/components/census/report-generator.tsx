'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ReportGeneratorProps {
  onReportGenerated?: (reportUrl: string) => void;
}

export default function ReportGenerator({ onReportGenerated }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Check for existing reports on mount
  useEffect(() => {
    checkExistingReports();
  }, []);

  const checkExistingReports = async () => {
    try {
      const response = await fetch('/api/list-reports');
      if (response.ok) {
        const data = await response.json();
        if (data.reports && data.reports.length > 0) {
          // Set the most recent report
          setReportUrl(data.reports[0].url);
        }
      }
    } catch (err) {
      console.error('Error checking existing reports:', err);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(0);
    setProgressMessage('Starting report generation...');

    try {
      // Use the streaming endpoint for real-time progress
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          limit: 1500,
          period: 'CurrYear'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
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
                setReportUrl(data.reportUrl);
                setProgress(100);
                setProgressMessage('Report generated successfully!');
                if (onReportGenerated) {
                  onReportGenerated(data.reportUrl);
                }
                
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
      console.error('Report generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShowReport = () => {
    if (reportUrl) {
      window.open(reportUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Generation</CardTitle>
        <CardDescription>
          Generate a comprehensive report analyzing the top 1500 popular investors
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <Button 
            onClick={handleGenerateReport} 
            disabled={isGenerating}
            className="w-full bg-[#00C896] hover:bg-[#00B085] text-white font-medium"
            size="lg"
          >
            {isGenerating ? 'Generating Report...' : 'Generate Report'}
          </Button>

          <Button 
            onClick={handleShowReport}
            disabled={!reportUrl}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Show Report
          </Button>
        </div>

        {isGenerating && (
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">
              {progressMessage}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        {reportUrl && !isGenerating && (
          <p className="text-sm text-muted-foreground text-center">
            Latest report available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
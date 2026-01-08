'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Calendar, FileText } from 'lucide-react';

interface ReportInfo {
  filename: string;
  date: string;
  displayDate: string;
}

function parseReportFilename(filename: string): ReportInfo | null {
  // Format: etoro-census-YYYY-MM-DD-HH-MM.html
  const match = filename.match(/etoro-census-(\d{4})-(\d{2})-(\d{2})-(\d{2})-(\d{2})\.html/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = `${year}-${month}-${day}`;
  const displayDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return { filename, date, displayDate };
}

export default function Home() {
  const [reports, setReports] = useState<ReportInfo[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await fetch('/api/list-reports');
        if (response.ok) {
          const data = await response.json();
          const parsedReports = data.reports
            .map((filename: string) => parseReportFilename(filename))
            .filter((r: ReportInfo | null): r is ReportInfo => r !== null)
            .sort((a: ReportInfo, b: ReportInfo) => b.date.localeCompare(a.date));

          setReports(parsedReports);
          if (parsedReports.length > 0) {
            setSelectedReport(parsedReports[0].filename);
          }
        }
      } catch (error) {
        console.error('Failed to fetch reports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  const currentReport = reports.find(r => r.filename === selectedReport);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Census Reports
              </CardTitle>
              <CardDescription>
                Daily analysis of eToro&apos;s top 1,500 popular investors
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select a report..." />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((report) => (
                    <SelectItem key={report.filename} value={report.filename}>
                      {report.displayDate}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedReport && (
                <a
                  href={`/reports/${selectedReport}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  title="Open report in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg">
              <div className="text-muted-foreground">Loading reports...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] bg-muted/20 rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Reports Available</h3>
              <p className="text-muted-foreground text-center max-w-md">
                Census reports are generated daily at 00:00 UTC. Check back later for the latest analysis.
              </p>
            </div>
          ) : (
            <div className="relative w-full" style={{ height: 'calc(100vh - 280px)', minHeight: '600px' }}>
              <iframe
                src={`/reports/${selectedReport}`}
                className="absolute inset-0 w-full h-full border rounded-lg bg-white"
                title={`Census Report - ${currentReport?.displayDate}`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
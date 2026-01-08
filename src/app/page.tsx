'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText } from 'lucide-react';

const GITHUB_PAGES_URL = 'https://weirdapps.github.io/etoro_census';

export default function Home() {
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
            <a
              href={GITHUB_PAGES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              title="Open reports in new tab"
            >
              Open in new tab
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative w-full" style={{ height: 'calc(100vh - 240px)', minHeight: '600px' }}>
            <iframe
              src={GITHUB_PAGES_URL}
              className="absolute inset-0 w-full h-full border rounded-lg bg-white"
              title="eToro Census Reports"
              allow="fullscreen"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
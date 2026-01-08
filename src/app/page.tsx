'use client';

import { ExternalLink } from 'lucide-react';

const GITHUB_PAGES_URL = 'https://weirdapps.github.io/etoro_census';

export default function Home() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">
          Daily analysis of top 1,500 popular investors
        </p>
        <a
          href={GITHUB_PAGES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Open in new tab
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="flex-1 min-h-[600px]">
        <iframe
          src={GITHUB_PAGES_URL}
          className="w-full h-full border rounded-lg bg-white"
          title="eToro Census Reports"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}
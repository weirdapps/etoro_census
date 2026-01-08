'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Users } from 'lucide-react';

const GITHUB_PAGES_URL = 'https://weirdapps.github.io/etoro_census';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          eToro Census
        </h1>
        <p className="text-xl text-muted-foreground">
          Daily insights from 1,500 top popular investors
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-2xl">
        <a
          href={GITHUB_PAGES_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col items-center p-10 rounded-2xl border-2 border-border hover:border-primary hover:bg-muted/50 transition-all"
        >
          <BarChart3 className="h-12 w-12 mb-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <h2 className="text-2xl font-semibold mb-2">Reports</h2>
          <p className="text-muted-foreground text-center mb-4">
            Daily census analysis
          </p>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </a>

        <Link
          href="/public"
          className="group flex flex-col items-center p-10 rounded-2xl border-2 border-border hover:border-primary hover:bg-muted/50 transition-all"
        >
          <Users className="h-12 w-12 mb-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <h2 className="text-2xl font-semibold mb-2">Portfolio</h2>
          <p className="text-muted-foreground text-center mb-4">
            Analyze any investor
          </p>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

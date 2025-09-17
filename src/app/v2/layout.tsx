import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eToro Popular Investors Census (V2)',
  description: 'Enhanced analysis of eToro\'s top popular investors with S-curve Fear & Greed Index',
};

export default function V2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            eToro Popular Investors Census
          </h1>
          <p className="text-muted-foreground">
            Enhanced V2 with S-curve Fear & Greed Index and Interactive Detail Pages
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            V2 Features Enabled
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
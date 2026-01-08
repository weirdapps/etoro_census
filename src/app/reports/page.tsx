'use client';

const GITHUB_PAGES_URL = 'https://weirdapps.github.io/etoro_census';

export default function ReportsPage() {
  return (
    <div className="fixed inset-0 top-16 bg-white dark:bg-background">
      <iframe
        src={GITHUB_PAGES_URL}
        className="w-full h-full border-0"
        title="eToro Census Reports"
        allow="fullscreen"
      />
    </div>
  );
}

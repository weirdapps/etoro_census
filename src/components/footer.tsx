import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-3 mt-auto">
      <div className="container mx-auto px-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <a
          href="https://github.com/weirdapps/etoro_census"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-primary transition-colors"
        >
          <Github className="h-3 w-3" />
          weirdapps
        </a>
        <span className="hidden sm:inline">·</span>
        <span>Not affiliated with eToro</span>
      </div>
    </footer>
  );
}

import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t py-6 mt-auto">
      <div className="container mx-auto px-6 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
        <a
          href="https://github.com/weirdapps/etoro_census"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 hover:text-primary transition-colors"
        >
          <Github className="h-4 w-4" />
          weirdapps
        </a>
        <span>·</span>
        <span>Not affiliated with eToro</span>
      </div>
    </footer>
  );
}

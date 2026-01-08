import Link from 'next/link';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50 py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Created by{' '}
              <a
                href="https://github.com/weirdapps"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                @weirdapps
              </a>
            </span>
            <span className="hidden md:inline">·</span>
            <a
              href="https://github.com/weirdapps/etoro_census"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>

          <p className="text-xs text-muted-foreground text-center md:text-right max-w-md">
            This project is not affiliated with, endorsed by, or connected to eToro.
            All trademarks belong to their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}

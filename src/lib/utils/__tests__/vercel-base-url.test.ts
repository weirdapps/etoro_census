import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getInternalBaseUrl } from '../vercel-base-url';

const KEYS = [
  'VERCEL_PROJECT_PRODUCTION_URL',
  'VERCEL_BRANCH_URL',
  'VERCEL_URL',
  'NEXT_PUBLIC_SITE_URL',
] as const;

describe('getInternalBaseUrl', () => {
  const snapshot: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      snapshot[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (snapshot[k] === undefined) delete process.env[k];
      else process.env[k] = snapshot[k];
    }
  });

  it('returns empty string when no env vars are set (local dev)', () => {
    expect(getInternalBaseUrl()).toBe('');
  });

  it('prefers VERCEL_PROJECT_PRODUCTION_URL over all others', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'etoro-census.vercel.app';
    process.env.VERCEL_BRANCH_URL = 'etoro-census-git-master-org.vercel.app';
    process.env.VERCEL_URL = 'etoro-census-abc123-org.vercel.app';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    expect(getInternalBaseUrl()).toBe('https://etoro-census.vercel.app');
  });

  it('falls back to VERCEL_BRANCH_URL on preview deployments (no prod alias)', () => {
    process.env.VERCEL_BRANCH_URL = 'etoro-census-git-feature-org.vercel.app';
    process.env.VERCEL_URL = 'etoro-census-xyz789-org.vercel.app';
    expect(getInternalBaseUrl()).toBe('https://etoro-census-git-feature-org.vercel.app');
  });

  it('falls back to VERCEL_URL only when no aliases are available', () => {
    process.env.VERCEL_URL = 'etoro-census-abc123-org.vercel.app';
    // This URL is auth-protected in practice — captured as last-resort behavior.
    expect(getInternalBaseUrl()).toBe('https://etoro-census-abc123-org.vercel.app');
  });

  it('falls back to NEXT_PUBLIC_SITE_URL for non-Vercel deploys', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://example.com';
    expect(getInternalBaseUrl()).toBe('https://example.com');
  });

  it('treats empty-string env vars as unset', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = '';
    process.env.VERCEL_URL = 'etoro-census-abc123-org.vercel.app';
    expect(getInternalBaseUrl()).toBe('https://etoro-census-abc123-org.vercel.app');
  });

  it('regression: must not fall through to VERCEL_URL when production alias exists', () => {
    // This is the exact bug — picking VERCEL_URL when a public alias is also set
    // sends the function's fetch into Vercel Deployment Protection (HTTP 401).
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'etoro-census.vercel.app';
    process.env.VERCEL_URL = 'etoro-census-abc123-org.vercel.app';
    expect(getInternalBaseUrl()).not.toContain('abc123');
    expect(getInternalBaseUrl()).toBe('https://etoro-census.vercel.app');
  });
});

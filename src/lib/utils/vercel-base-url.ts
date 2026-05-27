/**
 * Build a publicly-reachable absolute base URL for server-side fetches from
 * this Next.js deployment back to its own static assets (e.g. /public/data).
 *
 * Order of preference matters on Vercel: the *immutable* deployment URL
 * (VERCEL_URL, e.g. project-abc123-org.vercel.app) is gated by Vercel
 * Deployment Protection — fetching it returns HTTP 401 with an SSO redirect,
 * which silently breaks server-side self-fetches inside the same function.
 * The production alias and per-branch aliases are exempt from protection,
 * so prefer those.
 *
 * Returns '' when no env var resolves (local dev). Callers in that mode
 * should already be on a non-fetch load path (e.g. filesystem reads).
 *
 * Note: all sources are server-controlled env vars — never read the inbound
 * request's Host header here, that would reopen the SSRF vector closed by #79.
 */
export function getInternalBaseUrl(): string {
  const fromEnv = (key: string): string | undefined => {
    const v = process.env[key];
    return v && v.length > 0 ? v : undefined;
  };

  // 1. Production alias — always public, populated on every prod build.
  const productionAlias = fromEnv('VERCEL_PROJECT_PRODUCTION_URL');
  if (productionAlias) return `https://${productionAlias}`;

  // 2. Branch alias — preview deployments, exempt from Deployment Protection.
  const branchAlias = fromEnv('VERCEL_BRANCH_URL');
  if (branchAlias) return `https://${branchAlias}`;

  // 3. Immutable deployment URL — last resort; may be auth-gated.
  const deploymentUrl = fromEnv('VERCEL_URL');
  if (deploymentUrl) return `https://${deploymentUrl}`;

  // 4. Manual override for non-Vercel deployments.
  return fromEnv('NEXT_PUBLIC_SITE_URL') ?? '';
}

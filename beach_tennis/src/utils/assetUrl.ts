/**
 * Resolves a public asset path cleanly against Vite's BASE_URL so assets work
 * identically both at root ('/') and under a mounted subpath ('/beach_tennis/').
 */
export function assetUrl(path: string): string {
  const baseUrl = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL || '/';
  if (path.startsWith('/') && baseUrl !== '/') {
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }
  return path;
}

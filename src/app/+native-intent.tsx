/** @author Lokesh */
// Maps xserp's emailed links (https://<host>/erp/?u=<cp_token>) onto app routes.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    const url = new URL(path, 'https://placeholder');
    const token = url.searchParams.get('u');
    if (url.pathname.startsWith('/erp') && token) return `/reset-password?u=${encodeURIComponent(token)}`;
    if (url.pathname.startsWith('/erp')) return '/';
  } catch {
    // fall through
  }
  return path;
}

/** Client-side cookie helpers for small UI preferences (e.g. hide-balance
 *  toggles) that should persist across refresh/logout/login without using
 *  localStorage. Not for anything security-sensitive — just plain, readable
 *  preference flags. */

export function getClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setClientCookie(name: string, value: string, maxAgeDays = 365) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeDays * 24 * 60 * 60}; SameSite=Lax`;
}

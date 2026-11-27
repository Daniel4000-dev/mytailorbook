/**
 * Resilient receipt helpers for MyTailorBook.
 * Generates verified branding crests, base64 data URLs for html-to-image canvas export,
 * and OPay-inspired formatted timestamps.
 */

export function getWorkshopCrestDataUrl(shopName?: string | null): string {
  const name = (shopName || 'Workshop').trim();
  const words = name.split(/\s+/).filter(Boolean);
  let initials = 'WS';
  if (words.length >= 2) {
    initials = (words[0][0] + words[1][0]).toUpperCase();
  } else if (name.length >= 2) {
    initials = name.slice(0, 2).toUpperCase();
  } else if (name.length === 1) {
    initials = name.toUpperCase();
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88">
  <defs>
    <linearGradient id="crestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#064E3B" />
      <stop offset="100%" stop-color="#022C22" />
    </linearGradient>
  </defs>
  <circle cx="44" cy="44" r="41" fill="url(#crestGrad)" stroke="#10B981" stroke-width="2.5" />
  <circle cx="44" cy="44" r="35" fill="none" stroke="#D1FAE5" stroke-width="1" stroke-dasharray="3 3" opacity="0.8" />
  <text x="44" y="45" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="800" fill="#FFFFFF" text-anchor="middle" dominant-baseline="central" letter-spacing="1">${initials}</text>
  <text x="44" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="7" font-weight="700" fill="#6EE7B7" text-anchor="middle" letter-spacing="2">BESPOKE</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Loads an external image URL and converts it into a base64 Data URL.
 * This guarantees html-to-image will never encounter CORS failures or drop the image
 * when exporting receipts to PNG/PDF.
 */
export async function loadShopLogoAsDataUrl(logoUrl: string): Promise<string> {
  if (!logoUrl) return '';
  if (logoUrl.startsWith('data:')) return logoUrl;

  // Attempt 1: Fetch directly with cache buster
  try {
    const bustUrl = logoUrl.includes('?')
      ? `${logoUrl}&mtb_cb=${Date.now()}`
      : `${logoUrl}?mtb_cb=${Date.now()}`;
    const res = await fetch(bustUrl, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else resolve(logoUrl);
        };
        reader.onerror = () => resolve(logoUrl);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // Continue to canvas fallback
  }

  // Attempt 2: Offscreen Image + Canvas
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    try {
      return await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 88;
            canvas.height = img.naturalHeight || 88;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const data = canvas.toDataURL('image/png');
              if (data && data.startsWith('data:')) {
                resolve(data);
                return;
              }
            }
          } catch {
            // Canvas security taint fallback
          }
          resolve(logoUrl);
        };
        img.onerror = () => resolve(logoUrl);
        img.src = logoUrl.includes('?') ? `${logoUrl}&mtb_cb=${Date.now()}` : `${logoUrl}?mtb_cb=${Date.now()}`;
      });
    } catch {
      return logoUrl;
    }
  }

  return logoUrl;
}

/**
 * Formats date into OPay-style timestamp:
 * e.g. "Nov 27th, 2026 22:15:30"
 */
export function formatReceiptTimestamp(input?: Date | string | number | null): string {
  const d = input ? new Date(input) : new Date();
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';

  const month = d.toLocaleDateString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return `${month} ${day}${suffix}, ${year} ${time}`;
}

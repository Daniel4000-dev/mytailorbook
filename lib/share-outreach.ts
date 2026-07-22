/** Sharing a style photo + note through the device's native share sheet —
 *  the only way to hand a real photo (not just text) to WhatsApp, since
 *  wa.me links can only pre-fill text. Returns 'shared' only once the
 *  browser confirms the share sheet actually completed (not just opened),
 *  so outreach only gets logged as sent when it plausibly was. */
export async function shareStylePhoto(photoUrl: string, note: string): Promise<'shared' | 'cancelled' | 'unsupported'> {
  try {
    const response = await fetch(photoUrl);
    const blob = await response.blob();
    const file = new File([blob], 'style-photo.jpg', { type: blob.type || 'image/jpeg' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: note });
      return 'shared';
    }
    return 'unsupported';
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled';
    return 'unsupported';
  }
}

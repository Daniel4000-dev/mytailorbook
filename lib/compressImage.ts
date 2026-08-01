/** Client-side image compression, run in the browser before any Supabase
 *  Storage upload — resizes to a sane display resolution and re-encodes at
 *  a quality that's visually clean but meaningfully smaller. Matters most
 *  on slow Nigerian mobile connections, where a 4-8MB phone-camera photo
 *  can otherwise make a single upload take much longer than it needs to.
 *
 *  PNGs are kept as PNG (logos/avatars may rely on transparency) but still
 *  resized; everything else is re-encoded as JPEG. If compression somehow
 *  produces a larger file than the original (rare — already-optimized or
 *  tiny images), the original is returned instead. */

interface CompressImageOptions {
  /** Cap on the longer side, in pixels. Aspect ratio is preserved. */
  maxDimension?: number;
  /** JPEG quality, 0–1. Ignored for PNG output. */
  quality?: number;
}

export async function compressImage(file: File, options: CompressImageOptions = {}): Promise<File> {
  const { maxDimension = 1600, quality = 0.82 } = options;

  // HEIC/HEIF (the default format on iPhone cameras, when "High Efficiency"
  // is selected in Settings > Camera > Formats — very common) can't be
  // decoded by createImageBitmap in Chrome/Firefox/Android; only Safari's
  // native decoder handles it. Without converting this up front, the file
  // silently uploads unconverted: it "succeeds," but then renders as a
  // broken image everywhere except Safari. MIME type alone is unreliable
  // for HEIC across browsers/OSes (often reported blank), so this also
  // checks the file extension. heic2any runs a WASM decoder entirely
  // client-side, so this produces a real, working JPEG rather than just
  // failing with a friendlier error.
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.hei[cf]$/i.test(file.name);
  if (isHeic) {
    try {
      const heic2any = (await import('heic2any')).default;
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      file = new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
    } catch {
      throw new Error('This photo couldn’t be converted — please switch your iPhone camera to "Most Compatible" format in Settings, or try a different photo.');
    }
  }

  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const isPng = file.type === 'image/png';
    const outputType = isPng ? 'image/png' : 'image/jpeg';
    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, outputType, isPng ? undefined : quality)
    );
    if (!blob || blob.size >= file.size) return file;

    const ext = isPng ? 'png' : 'jpg';
    const name = file.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    return new File([blob], name, { type: outputType, lastModified: file.lastModified });
  } catch {
    // Compression is a nice-to-have, never a blocker — any failure (e.g. a
    // format createImageBitmap can't decode) just uploads the original.
    return file;
  }
}

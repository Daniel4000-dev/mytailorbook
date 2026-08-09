import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import Image from 'next/image';

/** Renders plain markdown `![alt](/images/...)` images inside blog post
 *  bodies. Wired up as the `img` override passed to MDXRemote (see
 *  app/blog/[slug]/page.tsx) — without this override, next-mdx-remote/rsc
 *  falls back to a bare <img>, which skips Next's image optimizer
 *  (resizing, AVIF/WebP negotiation, lazy loading) entirely.
 *
 *  next/image needs intrinsic width/height up front (or a sized parent for
 *  `fill`), and these dimensions vary per photo — so we read them straight
 *  off the file in public/ with sharp, which the project already depends
 *  on for Next's own image optimization. Only same-origin local paths
 *  (starting with "/") are supported, which covers every image actually
 *  used in blog content; anything else (a stray external URL) falls back
 *  to a plain <img> rather than erroring the whole page. */
export default async function MdxImage({ src, alt }: { src?: string; alt?: string }) {
  if (!src || !src.startsWith('/')) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt || ''} loading="lazy" />;
  }

  let width = 1200;
  let height = 800;
  try {
    const filePath = path.join(process.cwd(), 'public', src);
    const buffer = await fs.readFile(filePath);
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      width = metadata.width;
      height = metadata.height;
    }
  } catch {
    // Falls back to the default width/height above — still renders via
    // next/image, just without a perfectly matching aspect ratio.
  }

  return (
    <Image
      src={src}
      alt={alt || ''}
      width={width}
      height={height}
      sizes="(max-width: 900px) 100vw, 720px"
      style={{ width: '100%', height: 'auto' }}
    />
  );
}

import Image from 'next/image';

/** The book-mark icon, swapped between two source images per theme instead
 *  of the old single-file + CSS filter (brightness(0) invert(...)) trick —
 *  that filter can only flatten the whole icon to one flat tone, which lost
 *  the fill/stitch-detail contrast in dark mode. logo.png is the light-mode
 *  indigo-on-transparent version; logo-dark.png is a separate asset with
 *  its own two-tone indigo recoloring for dark backgrounds.
 *
 *  No default sizing here on purpose — pass width/height/object-fit via
 *  `className`. A previous version of BrandWordmark tried to default its
 *  own size and fought with each caller's override at equal CSS
 *  specificity; not repeating that here. */
export default function BrandIcon({ className, alt = '' }: { className?: string; alt?: string }) {
  return (
    <>
      <Image
        src="/images/logo.png"
        alt={alt}
        width={642}
        height={662}
        className={`brandIconLight ${className ?? ''}`}
      />
      <Image
        src="/images/logo-dark.png"
        alt={alt}
        width={642}
        height={662}
        className={`brandIconDark ${className ?? ''}`}
      />
    </>
  );
}

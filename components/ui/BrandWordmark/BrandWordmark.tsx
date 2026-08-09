import Image from 'next/image';
import { APP_CONFIG } from '@/lib/config';
import styles from './BrandWordmark.module.css';

/** The "mystitchbook" wordmark (Zekton, "stitch" in indigo) baked into two
 *  PNGs — one per theme — because Zekton's free license covers logo/image
 *  use but not live @font-face web embedding, so this can't just be a
 *  styled <span> the way the old serif brandTitle was. See
 *  public/images/wordmark-light.png / wordmark-dark.png.
 *
 *  `height` is applied inline (not via a className) so a caller's size
 *  always wins — two same-specificity `.wordmark` classes from different
 *  CSS modules previously fought over height with the winner decided by
 *  arbitrary bundle order, which is why callers' overrides kept losing. */
export default function BrandWordmark({ height = 22 }: { height?: number }) {
  const sizeStyle = { height, width: 'auto' as const };
  return (
    <>
      <Image
        src="/images/wordmark-light.png"
        alt={APP_CONFIG.name}
        width={942}
        height={145}
        style={sizeStyle}
        className={`${styles.wordmark} ${styles.wordmarkLight}`}
      />
      <Image
        src="/images/wordmark-dark.png"
        alt={APP_CONFIG.name}
        width={942}
        height={145}
        style={sizeStyle}
        className={`${styles.wordmark} ${styles.wordmarkDark}`}
      />
    </>
  );
}

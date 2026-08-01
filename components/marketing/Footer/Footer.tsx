import Link from 'next/link';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/config';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand}>
            <Image src="/images/logo-mark.png" alt="" width={496} height={496} className={`${styles.logo} brandLogoAuto`} />
            <span>{APP_CONFIG.name}</span>
          </Link>
          <p className={styles.tagline}>{APP_CONFIG.tagline}</p>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Product</span>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/portfolio-examples">Portfolio Examples</Link>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Company</span>
          <Link href="/about">About</Link>
          <Link href="/blog">Blog</Link>
          <a href={`mailto:support@${APP_CONFIG.domain}`}>Contact</a>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Legal</span>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>Built for tailors and fashion designers across Nigeria &amp; Africa</span>
        <span>&copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.</span>
      </div>
    </footer>
  );
}

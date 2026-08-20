import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import { APP_CONFIG } from '@/lib/config';
import { ROUTES } from '@/lib/routes';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <Link href={ROUTES.home} className={styles.brand}>
            <BrandIcon className={styles.logo} />
            <span>{APP_CONFIG.name}</span>
          </Link>
          <p className={styles.tagline}>{APP_CONFIG.tagline}</p>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Product</span>
          <Link href={ROUTES.features}>Features</Link>
          <Link href={ROUTES.pricing}>Pricing</Link>
          <Link href={ROUTES.portfolioExamples}>Portfolio Examples</Link>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Company</span>
          <Link href={ROUTES.about}>About</Link>
          <Link href={ROUTES.blog}>Blog</Link>
          <Link href={ROUTES.contact}>Contact</Link>
        </div>

        <div className={styles.linkCol}>
          <span className={styles.colLabel}>Legal</span>
          <Link href={ROUTES.terms}>Terms</Link>
          <Link href={ROUTES.privacy}>Privacy</Link>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>Built for tailors and fashion designers across Nigeria &amp; Africa</span>
        <span>&copy; {new Date().getFullYear()} {APP_CONFIG.name}. All rights reserved.</span>
      </div>
    </footer>
  );
}

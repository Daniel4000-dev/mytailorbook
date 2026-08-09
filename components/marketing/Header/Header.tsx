'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Symbol from '@/components/ui/Symbol/Symbol';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';
import BrandWordmark from '@/components/ui/BrandWordmark/BrandWordmark';
import styles from './Header.module.css';

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/portfolio-examples', label: 'Portfolio Examples' },
  { href: '/about', label: 'About' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={() => setMenuOpen(false)}>
          <BrandIcon className={styles.logo} />
          <BrandWordmark />
        </Link>

        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`${styles.navLink} ${pathname === link.href ? styles.navLinkActive : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/login" className={styles.loginLink}>
            Log In
          </Link>
          <Link href="/signup" className={styles.ctaButton}>
            Start Free
          </Link>
        </div>

        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <Symbol name={menuOpen ? 'close' : 'menu'} size={24} />
        </button>
      </div>

      {menuOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={styles.mobileNavLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className={styles.mobileActions}>
            <Link href="/login" className={styles.loginLink} onClick={() => setMenuOpen(false)}>
              Log In
            </Link>
            <Link href="/signup" className={styles.ctaButton} onClick={() => setMenuOpen(false)}>
              Start Free
            </Link>
          </div>
        </div>
      )}
      </header>
    </>
  );
}

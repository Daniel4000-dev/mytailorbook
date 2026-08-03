'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { APP_CONFIG } from '@/lib/config';
import Symbol from '@/components/ui/Symbol/Symbol';
import styles from './layout.module.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCustomAuth = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password';
  const isSignup = pathname === '/signup';

  useEffect(() => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', '#F8F8FE');
    document.documentElement.style.backgroundColor = '#F8F8FE';
    document.body.style.backgroundColor = '#F8F8FE';
    
    return () => {
      const cleanupMeta = document.querySelector('meta[name="theme-color"]');
      if (cleanupMeta) {
        cleanupMeta.setAttribute('content', '#FFFFFF');
      }
      document.documentElement.style.backgroundColor = '#FFFFFF';
      document.body.style.backgroundColor = '#FFFFFF';
    };
  }, []);

  return (
    <div className={`${styles.authLayout} ${isCustomAuth ? styles.loginLayout : ''} ${isSignup ? styles.signupLayout : ''}`}>
      {isCustomAuth ? (
        <div className={styles.splitWrapper}>
          {/* Left: Login/Signup/ForgotPassword Form */}
          <div className={styles.formPane}>
            <div className={styles.loginContent}>
              {children}
              <div className={styles.trustStrip}>
                <span>
                  <Symbol name="verified_user" size={16} />
                  Secure Data
                </span>
                <span className={styles.trustDot} aria-hidden="true" />
                <span>
                  <Symbol name="cloud_sync" size={16} />
                  Auto Sync
                </span>
              </div>
            </div>
          </div>
          
          {/* Right: Premium editorial branding panel (Desktop only) — real
             curated photography, same as the marketing site, so this
             doesn't feel like a different product from what the visitor
             just saw on the homepage. */}
          <div className={styles.editorialPane}>
            <Image
              src={isSignup ? '/images/marketing/atelier-review.jpg' : '/images/marketing/hero-tailor-tablet.jpg'}
              alt=""
              fill
              sizes="50vw"
              className={styles.editorialImage}
            />
            <div className={styles.editorialScrim} />
            <div className={styles.editorialContent}>
              <div className={styles.tag}>Bespoke Workshop</div>
              <h2 className={styles.editorialTitle}>Manage orders, measurements, and clients.</h2>
              <p className={styles.editorialText}>
                {isSignup
                  ? 'Set up your shop in under two minutes. Unlimited customers and custom styles, free forever — no card required.'
                  : 'Capture measurements, track every order, and give your customers a premium experience, all in one workspace.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!isCustomAuth && (
            <div className={styles.branding}>
              <Image src="/images/logo-full.png" alt={APP_CONFIG.name} width={1024} height={1024} className={styles.logo} />
              <p className={styles.tagline}>{APP_CONFIG.tagline}</p>
            </div>
          )}
          <div className={styles.content}>{children}</div>
        </>
      )}
    </div>
  );
}

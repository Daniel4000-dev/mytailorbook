'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { APP_CONFIG } from '@/lib/config';
import styles from './layout.module.css';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isCustomAuth = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
  const isSignup = pathname === '/signup';

  return (
    <div className={`${styles.authLayout} ${isCustomAuth ? styles.loginLayout : ''} ${isSignup ? styles.signupLayout : ''}`}>
      {isCustomAuth ? (
        <div className={styles.splitWrapper}>
          {/* Left: Login/Signup/ForgotPassword Form */}
          <div className={styles.formPane}>
            <div className={styles.loginContent}>
              {children}
            </div>
          </div>
          
          {/* Right: Premium editorial branding panel (Desktop only) */}
          <div className={styles.editorialPane}>
            <div className={styles.meshBg} />
            <div className={styles.editorialContent}>
              <div className={styles.tag}>BESPOKE WORKSHOP</div>
              <h2 className={styles.editorialTitle}>Crafting Perfection, One Stitch at a Time.</h2>
              <p className={styles.editorialText}>
                MyTailorBook empowers master tailors to seamlessly capture measurements, track custom order pipelines, and manage workshop finances all in one premium workspace.
              </p>
              
              <div className={styles.illustrationCard}>
                <svg viewBox="0 0 100 100" className={styles.mannequinIcon} fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* High end abstract golden hanger/mannequin design */}
                  <path d="M50 15v10M32 30h36v2c0 10-18 20-18 35v15M36 82h28" stroke="var(--sf-accent-gold)" strokeWidth="1.5" strokeLinecap="round" />
                  <ellipse cx="50" cy="11" rx="4" ry="4" stroke="var(--sf-accent-gold)" strokeWidth="1.5" />
                  <path d="M50 25c-8 3-18 10-18 20v15c0 8 8 15 18 20 10-5 18-12 18-20V45c0-10-10-17-18-20z" fill="rgba(212, 175, 55, 0.05)" stroke="var(--sf-accent-gold)" strokeWidth="1" strokeDasharray="3 3" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!isCustomAuth && (
            <div className={styles.branding}>
              <h1 className={styles.logo}>{APP_CONFIG.name}</h1>
              <p className={styles.tagline}>{APP_CONFIG.tagline}</p>
            </div>
          )}
          <div className={styles.content}>{children}</div>
        </>
      )}
    </div>
  );
}

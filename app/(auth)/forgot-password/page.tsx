'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthInput from '../components/AuthInput';
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email');
      return;
    }
    try {
      await resetPassword(email);
      setSent(true);
    } catch {
      setError('Could not send reset link');
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        {/* Sewing Machine Logo */}
        <div className={styles.logoWrapper}>
          <img
            src="/images/sewing-machine.svg"
            alt="Sewing Machine"
            className={styles.sewingMachineSvg}
          />
        </div>

        {/* Brand Title */}
        <h1 className={styles.brandTitle}>MYTAILORBOOK</h1>

        <div className={styles.successWrapper}>
          <div className={styles.successIconWrapper}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successHeading}>Check your email</h2>
          <p className={styles.successText}>
            We&apos;ve sent a password reset link to <br/>
            <strong>{email}</strong>
          </p>
          <Link href="/login" className={styles.registerButton} style={{ marginTop: '24px' }}>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Sewing Machine Logo */}
      <div className={styles.logoWrapper}>
        <img
          src="/images/sewing-machine.svg"
          alt="Sewing Machine"
          className={styles.sewingMachineSvg}
        />
      </div>

      {/* Brand Title */}
      <h1 className={styles.brandTitle}>MYTAILORBOOK</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <p className={styles.subheading}>
          Enter your email and we&apos;ll send you a password reset link.
        </p>

        {/* Email Field */}
        <AuthInput
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Primary Submit Button */}
        <button type="submit" className={styles.loginButton} disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Sending Link...' : 'Send Reset Link'}
        </button>

        {/* Footer separator */}
        <div className={styles.footerLabel}>Remember your password?</div>

        {/* Secondary Back to Login Link */}
        <Link href="/login" className={styles.registerButton}>
          Back to Login
        </Link>
      </form>
    </div>
  );
}

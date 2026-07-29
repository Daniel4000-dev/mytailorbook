'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password || !confirmPw) {
      setError('Please fill in both fields');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Requires the recovery session established by clicking the emailed
      // link (handled by /auth/confirm) — if that's missing or expired,
      // this fails with a clear error rather than silently doing nothing.
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (updateError.message.toLowerCase().includes('session')) {
          throw new Error('This link has expired or is invalid. Please request a new password reset.');
        }
        throw new Error(updateError.message);
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password. The link may have expired — request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <img src="/images/logo-mark.png" alt="SabiTailors" className={styles.sewingMachineSvg} />
        </div>
        <h1 className={styles.brandTitle}>SABITAILORS</h1>
        <div className={styles.successWrapper}>
          <div className={styles.successIconWrapper}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2 className={styles.successHeading}>Password updated</h2>
          <p className={styles.successText}>Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.logoWrapper}>
        <img src="/images/logo-mark.png" alt="SabiTailors" className={styles.sewingMachineSvg} />
      </div>
      <h1 className={styles.brandTitle}>SABITAILORS</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <div className={styles.errorBanner}>{error}</div>}

        <p className={styles.subheading}>Choose a new password for your account.</p>

        <AuthInput
          id="password"
          type="password"
          label="New Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasEyeIcon
          required
        />
        <AuthInput
          id="confirmPw"
          type="password"
          label="Confirm New Password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          hasEyeIcon
          required
        />

        <button type="submit" className={styles.loginButton} disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

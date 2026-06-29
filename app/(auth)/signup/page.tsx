'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import AuthInput from '../components/AuthInput';
import styles from './page.module.css';

export default function SignupPage() {
  const router = useRouter();
  const { signup, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPw) {
      setError('Please fill in all fields');
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
    try {
      await signup(name, email, password);
      router.push('/dashboard');
    } catch {
      setError('Could not create account');
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    try {
      await signup('Google User', 'google.user@masterfit.ng', 'google');
      router.push('/dashboard');
    } catch {
      setError('Could not connect with Google');
    }
  };

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

        {/* Full Name Field */}
        <AuthInput
          id="name"
          type="text"
          label="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Email Field */}
        <AuthInput
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Password Field */}
        <AuthInput
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasEyeIcon
          required
        />

        {/* Confirm Password Field */}
        <AuthInput
          id="confirmPw"
          type="password"
          label="Confirm Password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          hasEyeIcon
          required
        />

        {/* Primary Submit Button */}
        <button type="submit" className={styles.loginButton} disabled={loading} style={{ marginTop: '12px' }}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>

        {/* Divider */}
        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine} />
        </div>

        {/* Google CTA */}
        <button
          type="button"
          className={styles.googleButton}
          onClick={handleGoogleAuth}
          disabled={loading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
          Sign up with Google
        </button>

        {/* Footer label */}
        <div className={styles.footerLabel}>Already have an account?</div>

        {/* Secondary Link to Login */}
        <Link href="/login" className={styles.registerButton}>
          Log in
        </Link>
      </form>
    </div>
  );
}

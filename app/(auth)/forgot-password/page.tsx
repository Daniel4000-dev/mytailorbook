'use client';

import { useState } from 'react';
import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations';
import styles from './page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import BrandWordmark from '@/components/ui/BrandWordmark/BrandWordmark';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const emailWatcher = watch('email');

  const onSubmit = async (data: ResetPasswordInput) => {
    setApiError('');
    setSubmitting(true);
    try {
      await resetPassword(data.email);
      setSent(true);
    } catch {
      setApiError('Could not send reset link');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className={styles.container}>
        {/* Sewing Machine Logo */}
        <div className={styles.logoWrapper}>
          <BrandIcon alt="MyStitchBook" className={styles.sewingMachineSvg} />
        </div>

        {/* Brand Title */}
        <div className={styles.brandTitle}>
          <BrandWordmark height={32} />
        </div>

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
            <strong>{emailWatcher}</strong>
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
        <BrandIcon alt="MyStitchBook" className={styles.sewingMachineSvg} />
      </div>

      {/* Brand Title */}
      <div className={styles.brandTitle}>
        <BrandWordmark height={32} />
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {apiError && <div className={styles.errorBanner}>{apiError}</div>}

        <p className={styles.subheading}>
          Enter your email and we&apos;ll send you a password reset link.
        </p>

        {/* Email Field */}
        <div>
          <AuthInput
            id="email"
            type="email"
            label="Email"
            {...register('email')}
          />
          {errors.email && <div className={styles.errorText}>{errors.email.message}</div>}
        </div>

        {/* Primary Submit Button */}
        <button type="submit" className={styles.loginButton} disabled={submitting} style={{ marginTop: '24px' }}>
          {submitting && <Symbol name="progress_activity" className="global-spinner" />}
          {submitting ? 'Sending link...' : 'Send reset link'}
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

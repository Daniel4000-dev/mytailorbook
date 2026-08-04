'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaSpinner } from 'react-icons/fa6';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClient } from '@/lib/supabase/client';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import { updatePasswordSchema, type UpdatePasswordInput } from '@/lib/validations';
import styles from './page.module.css';

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
  });

  const onSubmit = async (data: UpdatePasswordInput) => {
    setApiError('');
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password: data.password });
      if (updateError) {
        if (updateError.message.toLowerCase().includes('session')) {
          throw new Error('This link has expired or is invalid. Please request a new password reset.');
        }
        throw new Error(updateError.message);
      }
      setDone(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not reset password. The link may have expired — request a new one.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.container}>
        <div className={styles.logoWrapper}>
          <Image src="/images/logo-mark.png" alt="MyStitchBook" width={496} height={496} className={`${styles.sewingMachineSvg} brandLogoAuto`} />
        </div>
        <h1 className={styles.brandTitle}>MYSTITCHBOOK</h1>
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
        <Image src="/images/logo-mark.png" alt="MyStitchBook" width={496} height={496} className={`${styles.sewingMachineSvg} brandLogoAuto`} />
      </div>
      <h1 className={styles.brandTitle}>MYSTITCHBOOK</h1>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {apiError && <div className={styles.errorBanner}>{apiError}</div>}

        <p className={styles.subheading}>Choose a new password for your account.</p>

        <div>
          <AuthInput
            id="password"
            type="password"
            label="New Password"
            hasEyeIcon
            {...register('password')}
          />
          {errors.password && <div className={styles.errorText}>{errors.password.message}</div>}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <AuthInput
            id="confirmPw"
            type="password"
            label="Confirm Password"
            hasEyeIcon
            {...register('confirmPw')}
          />
          {errors.confirmPw && <div className={styles.errorText}>{errors.confirmPw.message}</div>}
        </div>

        <button type="submit" className={styles.loginButton} disabled={loading} style={{ marginTop: '24px' }}>
          {loading && <FaSpinner className="global-spinner" />}
          {loading ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BrandIcon from '@/components/ui/BrandIcon/BrandIcon';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { isAuthRetryableFetchError, isAuthApiError } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import AuthInput from '@/components/ui/AuthInput/AuthInput';
import { loginSchema, type LoginInput } from '@/lib/validations';
import styles from './page.module.css';
import Symbol from '@/components/ui/Symbol/Symbol';
import BrandWordmark from '@/components/ui/BrandWordmark/BrandWordmark';

export default function LoginPage() {
  const router = useRouter();
  const { login, signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    const handleFocus = () => {
      setGoogleLoading(false);
    };
    window.addEventListener('pageshow', handleFocus);
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('pageshow', handleFocus);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const onSubmit = async (data: LoginInput) => {
    setApiError('');
    setSubmitting(true);
    try {
      await login(data.email, data.password);
      router.push('/dashboard');
    } catch (err) {
      if (isAuthRetryableFetchError(err)) {
        setApiError('Could not reach the server — check your connection and try again.');
      } else if (isAuthApiError(err) && err.code === 'invalid_credentials') {
        setApiError('Invalid email or password');
      } else {
        setApiError('Something went wrong — please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setGoogleLoading(false);
      setApiError(err instanceof Error ? err.message : 'Failed to sign in with Google');
    }
  };

  return (
    <div className={styles.container}>
      {/* Sewing Machine Logo */}
      <div className={styles.logoWrapper}>
        <BrandIcon alt="MyStitchBook" className={styles.sewingMachineSvg} />
      </div>

      {/* Brand Title */}
      <div className={styles.brandTitle}>
        <BrandWordmark height={30} />
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        {apiError && <div className={styles.errorBanner}>{apiError}</div>}

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

        {/* Password Field */}
        <div style={{ marginTop: '1rem' }}>
          <AuthInput
            id="password"
            type="password"
            label="Password"
            hasEyeIcon
            {...register('password')}
          />
          {errors.password && <div className={styles.errorText}>{errors.password.message}</div>}
        </div>

        {/* Forgot Password */}
        <div className={styles.forgotPasswordWrapper}>
          <Link href="/forgot-password" className={styles.forgotPasswordLink}>
            Forgot password?
          </Link>
        </div>

        {/* Log in Button */}
        <button type="submit" className={styles.loginButton} disabled={submitting}>
          {submitting && <Symbol name="progress_activity" className="global-spinner" />}
          {submitting ? 'Logging in...' : 'Log in'}
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
          onClick={handleGoogle}
          disabled={submitting || googleLoading}
        >
          {googleLoading && <Symbol name="progress_activity" className="global-spinner" />}
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
          Sign in with Google
        </button>

        {/* Footer separator text */}
        <div className={styles.footerLabel}>Don’t have an account?</div>

        {/* Register Link */}
        <Link href="/signup" className={styles.registerButton}>
          Register
        </Link>
      </form>
    </div>
  );
}

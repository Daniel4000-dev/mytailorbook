'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  /** True when someone has a real Supabase session but no `profiles` row yet —
   *  happens the first time a person signs in with Google, since OAuth gives
   *  us no chance to ask for a shop name before the account is created. */
  needsOnboarding: boolean;
  googleUserInfo: { name: string; email: string; isGoogleAccount: boolean } | null;
  /** True from the moment logout is triggered until the redirect to /login
   *  completes — lets the UI show a full-screen overlay instead of a frame
   *  of empty/placeholder data as `user` and shop data clear out. */
  isLoggingOut: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** Returns whether Supabase actually requires clicking an email link before
   *  login works — this depends on the project's "Confirm email" setting,
   *  so the signup page can adapt without any code changes later. */
  signup: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Fetches the `profiles` row for a logged-in auth user and shapes it into our `User` type. */
async function loadUserProfile(supabase: ReturnType<typeof createClient>, authUserId: string, email: string): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, shop_id, name, role, active, avatar_url, created_at')
    .eq('id', authUserId)
    .single();

  if (error || !profile) return null;

  return {
    uid: profile.id,
    name: profile.name,
    email,
    role: profile.role,
    shopId: profile.shop_id,
    active: profile.active,
    avatarUrl: profile.avatar_url || undefined,
    createdAt: profile.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<{ name: string; email: string; isGoogleAccount: boolean } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  const syncFromSession = useCallback(
    async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session?.user) {
        setUser(null);
        setNeedsOnboarding(false);
        setGoogleUserInfo(null);
        return;
      }
      const profile = await loadUserProfile(supabase, session.user.id, session.user.email!);
      if (profile) {
        setUser(profile);
        setNeedsOnboarding(false);
        setGoogleUserInfo(null);
        // A real session with a profile means we're logged in, not logging
        // out — clears the overlay for the next time this user lands in (app).
        setIsLoggingOut(false);
      } else {
        // Authenticated with Supabase, but no shop/profile exists yet.
        setUser(null);
        setNeedsOnboarding(true);
        setGoogleUserInfo({
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || '',
          email: session.user.email!,
          isGoogleAccount: session.user.app_metadata?.provider === 'google',
        });
      }
    },
    [supabase]
  );

  // On mount, and whenever Supabase's own auth state changes (login/logout
  // in another tab, token refresh, etc.), sync our `user` to match.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => syncFromSession(session).finally(() => setLoading(false)));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncFromSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase, syncFromSession]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      // Thrown as-is (not wrapped in a plain Error) so callers can use
      // isAuthRetryableFetchError() to tell a network/timeout failure
      // apart from genuinely wrong credentials, instead of always
      // assuming the latter.
      throw error;
    }
    // onAuthStateChange above picks up the new session and sets `user`.
    setLoading(false);
  }, [supabase]);

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      setLoading(true);
      try {
        // Shop creation now happens entirely in onboarding (see
        // app/onboarding/page.tsx + completeOnboarding) — signup only
        // creates the bare auth account, carrying `name` through in user
        // metadata so onboarding can pre-fill it without asking again.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
            data: { name },
          },
        });
        if (error) throw new Error(error.message);
        // If "Confirm email" is off in the Supabase project, signUp() already
        // returns a live session — no email step needed, log them straight in.
        // onAuthStateChange picks up that session automatically.
        return { needsEmailConfirmation: !data.session };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/confirm?next=/dashboard` },
    });
    if (error) throw new Error(error.message);
    // Browser navigates away to Google here — nothing else to do client-side.
  }, [supabase]);

  const logout = useCallback(async () => {
    // Flip this first — the layout swaps to a full-screen overlay the
    // instant this is set, so the frame where `user`/shop data clears to
    // empty is never actually painted.
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    setUser(null);
    setNeedsOnboarding(false);
    setGoogleUserInfo(null);
  }, [supabase]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    if (error) throw new Error(error.message);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await syncFromSession(session);
  }, [supabase, syncFromSession]);

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!user) return;
    const { error } = await supabase.from('profiles').update({ avatar_url: avatarUrl || null }).eq('id', user.uid);
    if (error) throw new Error(error.message);
    await refreshProfile();
  }, [supabase, user, refreshProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isOwner: user?.role === 'Owner',
      isStaff: user?.role === 'Staff',
      needsOnboarding,
      googleUserInfo,
      isLoggingOut,
      login,
      signup,
      signInWithGoogle,
      logout,
      resetPassword,
      refreshProfile,
      updateAvatar,
    }),
    [user, loading, needsOnboarding, googleUserInfo, isLoggingOut, login, signup, signInWithGoogle, logout, resetPassword, refreshProfile, updateAvatar]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

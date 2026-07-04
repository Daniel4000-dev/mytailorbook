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
import { signupOwner } from '@/app/auth-actions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, shopName: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Fetches the `profiles` row for a logged-in auth user and shapes it into our `User` type. */
async function loadUserProfile(supabase: ReturnType<typeof createClient>, authUserId: string, email: string): Promise<User | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, shop_id, name, role, active, created_at')
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
    createdAt: profile.created_at,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createClient(), []);

  // On mount, and whenever Supabase's own auth state changes (login/logout
  // in another tab, token refresh, etc.), sync our `user` to match.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await loadUserProfile(supabase, session.user.id, session.user.email!);
        setUser(profile);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await loadUserProfile(supabase, session.user.id, session.user.email!);
        setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }
    // onAuthStateChange above picks up the new session and sets `user`.
    setLoading(false);
  }, [supabase]);

  const signup = useCallback(
    async (name: string, email: string, password: string, shopName: string) => {
      setLoading(true);
      try {
        // Admin-created (server action) so the account is pre-confirmed —
        // then we sign in normally to establish this browser's session.
        await signupOwner(name, email, password, shopName);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, [supabase]);

  const resetPassword = useCallback(async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email);
  }, [supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isOwner: user?.role === 'Owner',
      isStaff: user?.role === 'Staff',
      login,
      signup,
      logout,
      resetPassword,
    }),
    [user, loading, login, signup, logout, resetPassword]
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

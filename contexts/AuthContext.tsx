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
import type { User, Role } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mockData';
import { loginAction, logoutAction, getSessionAction } from '@/app/actions';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isOwner: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from session cookie on mount
  useEffect(() => {
    getSessionAction().then((savedUid) => {
      if (savedUid) {
        const found = MOCK_USERS.find(u => u.uid === savedUid);
        if (found) {
          setUser(found);
        }
      }
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, _password: string) => {
    setLoading(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));

    // Mock: match by email, fallback to Owner
    const found = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    const authedUser = found ?? MOCK_USERS[0];
    setUser(authedUser);
    
    // Set cookie via server action
    await loginAction(authedUser.uid);
    setLoading(false);
  }, []);

  const signup = useCallback(
    async (name: string, email: string, _password: string) => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 800));

      // Mock: create new Staff user
      const newUser: User = {
        uid: `user-${Date.now()}`,
        name,
        email,
        role: 'Owner' as Role,
        createdAt: new Date().toISOString(),
      };
      // In a real app we'd save this to MOCK_USERS/DB. For MVP, just log them in locally.
      setUser(newUser);
      
      await loginAction(newUser.uid);
      setLoading(false);
    },
    []
  );

  const logout = useCallback(async () => {
    setUser(null);
    await logoutAction();
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    await new Promise((r) => setTimeout(r, 800));
    // Mock: just resolves
  }, []);

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

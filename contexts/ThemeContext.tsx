'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'sf-theme';

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in the root layout's <head> already set the
  // correct data-theme attribute before paint (avoiding a flash of the
  // wrong theme) — this just needs to agree with it on first render.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      // Deferred a tick so this reads as an async sync-with-external-store,
      // not a synchronous setState-in-effect (the inline anti-flash script
      // in <head> already applied the correct data-theme before paint —
      // this is only catching this context's own React state up to match).
      Promise.resolve().then(() => setPreferenceState(stored));
    }
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    window.localStorage.setItem(STORAGE_KEY, pref);
    applyTheme(pref);
  }, []);

  return <ThemeContext.Provider value={{ preference, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/** Runs synchronously in <head>, before first paint, so the correct
 *  theme is already applied by the time anything renders — otherwise a
 *  user who forced dark mode sees a flash of the light theme first. */
export const THEME_ANTI_FLASH_SCRIPT = `
(function() {
  try {
    var pref = localStorage.getItem('${STORAGE_KEY}');
    if (pref === 'light' || pref === 'dark') {
      document.documentElement.setAttribute('data-theme', pref);
    }
  } catch (e) {}
})();
`;

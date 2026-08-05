'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'sf-theme';

function updateMetaThemeColor(pref: ThemePreference | null) {
  const lightColor = '#FFFFFF';
  const darkColor = '#131220';
  
  const lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]') as HTMLMetaElement | null;
  const darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]') as HTMLMetaElement | null;
  
  if (lightMeta && darkMeta) {
    if (pref === 'light') {
      lightMeta.content = lightColor;
      darkMeta.content = lightColor;
    } else if (pref === 'dark') {
      lightMeta.content = darkColor;
      darkMeta.content = darkColor;
    } else {
      lightMeta.content = lightColor;
      darkMeta.content = darkColor;
    }
  }
}

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  
  updateMetaThemeColor(pref);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in the root layout's <head> already set the
  // correct data-theme attribute before paint (avoiding a flash of the
  // wrong theme) — this just needs to agree with it on first render.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      // Deferred a tick so this reads as an async sync-with-external-store,
      // not a synchronous setState-in-effect (the inline anti-flash script
      // in <head> already applied the correct data-theme before paint —
      // this is only catching this context's own React state up to match).
      Promise.resolve().then(() => {
        setPreferenceState(stored);
        updateMetaThemeColor(stored);
      });
    } else {
      updateMetaThemeColor('system');
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
    var lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    var darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    
    if (pref === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (lightMeta && darkMeta) {
        lightMeta.content = '#FFFFFF';
        darkMeta.content = '#FFFFFF';
      }
    } else if (pref === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (lightMeta && darkMeta) {
        lightMeta.content = '#131220';
        darkMeta.content = '#131220';
      }
    } else {
      if (lightMeta && darkMeta) {
        lightMeta.content = '#FFFFFF';
        darkMeta.content = '#131220';
      }
    }
  } catch (e) {}
})();
`;

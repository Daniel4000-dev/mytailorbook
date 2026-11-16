'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'sf-theme';

export function syncThemeColor(pref: ThemePreference | null, isMenuOpen: boolean = false) {
  if (typeof window === 'undefined') return;

  const isDark =
    pref === 'dark' ||
    ((!pref || pref === 'system') &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const color = isMenuOpen
    ? (isDark ? '#1B1A2B' : '#E9E8F0')
    : (isDark ? '#0A0910' : '#FFFFFF');

  // 1. Immediately paint root html and body — this colors the iOS status bar,
  // safe area notch, and home indicator rubber-band instantaneously without lag
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  // 2. Direct unconstrained theme-color meta tag for instant browser chrome & PWA status bar repaint
  let directMeta = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement | null;
  if (!directMeta) {
    directMeta = document.createElement('meta');
    directMeta.name = 'theme-color';
    document.head.appendChild(directMeta);
  }
  directMeta.setAttribute('content', color);

  // 3. Keep media-specific meta tags in sync as well
  const lightMeta = document.querySelector('meta[name="theme-color"][media*="light"]') as HTMLMetaElement | null;
  const darkMeta = document.querySelector('meta[name="theme-color"][media*="dark"]') as HTMLMetaElement | null;
  if (lightMeta) {
    lightMeta.setAttribute('content', pref === 'dark' ? color : (isMenuOpen ? '#E9E8F0' : '#FFFFFF'));
  }
  if (darkMeta) {
    darkMeta.setAttribute('content', pref === 'light' ? color : (isMenuOpen ? '#1B1A2B' : '#0A0910'));
  }
}

function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  const isDark =
    pref === 'dark' ||
    (pref === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (pref === 'system') {
    root.setAttribute('data-theme-preference', 'system');
  } else {
    root.removeAttribute('data-theme-preference');
  }

  syncThemeColor(pref);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The inline script in the root layout's <head> already set the
  // correct data-theme attribute before paint (avoiding a flash of the
  // wrong theme) — this just needs to agree with it on first render.
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    const initialPref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';

    Promise.resolve().then(() => {
      setPreferenceState(initialPref);
      syncThemeColor(initialPref);
    });

    // Listen to OS system color scheme changes when in 'system' mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      const currentStored = window.localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      if (!currentStored || currentStored === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        syncThemeColor('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
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
    var isDark = pref === 'dark' || ((!pref || pref === 'system') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var color = isDark ? '#0A0910' : '#FFFFFF';
    
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    if (!pref || pref === 'system') {
      document.documentElement.setAttribute('data-theme-preference', 'system');
    }
    
    document.documentElement.style.backgroundColor = color;
    if (document.body) {
      document.body.style.backgroundColor = color;
    }
    
    var directMeta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (!directMeta) {
      directMeta = document.createElement('meta');
      directMeta.name = 'theme-color';
      document.head.appendChild(directMeta);
    }
    directMeta.setAttribute('content', color);
  } catch (e) {}
})();
`;

import { writable, derived } from 'svelte/store';

export type ThemePreference = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const STORAGE_KEY = 'lucia-theme';

function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as ThemePreference) || 'dark';
}

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const themePreference = writable<ThemePreference>(getStoredPreference());

export const effectiveTheme = derived(themePreference, ($pref) => {
  if ($pref === 'system') return getSystemTheme();
  return $pref;
});

export function setTheme(pref: ThemePreference) {
  themePreference.set(pref);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, pref);
  }
  applyTheme(pref === 'system' ? getSystemTheme() : pref);
}

export function applyTheme(theme: EffectiveTheme) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (theme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  // Update PWA theme-color meta tag
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#ffffff');
  }
}

// Listen for system preference changes when in 'system' mode
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference;
    if (stored === 'system') {
      applyTheme(getSystemTheme());
    }
  });
}

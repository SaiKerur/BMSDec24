/**
 * BMS design tokens — documented CSS custom properties.
 * @see docs/DESIGN_TOKENS.md
 */
export const tokens = {
  color: {
    bg: 'var(--color-bg)',
    surface: 'var(--color-surface)',
    surface2: 'var(--color-surface-2)',
    border: 'var(--color-border)',
    text: 'var(--color-text)',
    muted: 'var(--color-muted)',
    primary: 'var(--color-primary)',
    primaryHover: 'var(--color-primary-hover)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
  },
  radius: 'var(--radius-md)',
  shadow: 'var(--shadow-md)',
} as const;

export type ThemeMode = 'light' | 'dark';

export const THEME_KEY = 'bms_theme';

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_KEY, mode);
}

import type { CustomStyles } from './types';

export interface Theme {
  id: string;
  name: string;
  icon: string;
  styles: CustomStyles;
}

const HIGH_CONTRAST_THEME: Theme = {
  id: 'high-contrast',
  name: 'High Contrast',
  icon: '⬛',
  styles: { backgroundColor: '#000000', textColor: '#ffffff', fontSize: '18' },
};

const DYSLEXIA_THEME: Theme = {
  id: 'dyslexia',
  name: 'Dyslexia Friendly',
  icon: '🔤',
  styles: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '18',
    customCSS:
      'body { letter-spacing: 0.05em !important; word-spacing: 0.1em !important; line-height: 1.8 !important; }',
  },
};

export const BUILT_IN_THEMES: Theme[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    icon: '🌙',
    styles: { backgroundColor: '#1a1a1a', textColor: '#e0e0e0' },
  },
  HIGH_CONTRAST_THEME,
  {
    id: 'readable',
    name: 'Readable',
    icon: '📖',
    styles: {
      fontFamily: 'Georgia, serif',
      fontSize: '18',
      customCSS: 'p { line-height: 1.8 !important; max-width: 70ch !important; }',
    },
  },
  DYSLEXIA_THEME,
  {
    id: 'sepia',
    name: 'Sepia',
    icon: '📜',
    styles: { backgroundColor: '#f4e4c1', textColor: '#5b4636' },
  },
];

export const ACCESSIBILITY_PRESETS: Theme[] = [
  HIGH_CONTRAST_THEME,
  { id: 'large-text', name: 'Large Text', icon: '🔠', styles: { fontSize: '24' } },
  DYSLEXIA_THEME,
  {
    id: 'reduced-motion',
    name: 'Reduced Motion',
    icon: '🎞️',
    styles: { customCSS: '* { animation: none !important; transition: none !important; }' },
  },
];

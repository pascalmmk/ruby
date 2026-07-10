/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1A1013',
    background: '#FFFBFC',
    backgroundElement: '#F6EEF0',
    backgroundSelected: '#EEE1E5',
    textSecondary: '#6E5F64',
    // ruby accent + supporting tokens
    accent: '#D01E3C',
    accentPressed: '#A81830',
    accentSoft: '#FBE9EC',
    onAccent: '#FFFFFF',
    border: '#EADDE1',
  },
  dark: {
    text: '#FCF6F7',
    background: '#120E10',
    backgroundElement: '#211A1D',
    backgroundSelected: '#2F2529',
    textSecondary: '#B4A8AD',
    accent: '#E23A50',
    accentPressed: '#C21F38',
    accentSoft: '#2A1418',
    onAccent: '#FFFFFF',
    border: '#33292E',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

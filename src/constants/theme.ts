/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#30282B',
    background: '#FFFCFD',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EEEBE6',
    textSecondary: '#756D70',
    // ruby accent + supporting tokens
    accent: '#A52D47',
    accentPressed: '#832039',
    accentSoft: '#F3E6E8',
    onAccent: '#FFFFFF',
    border: '#E6DFDA',
    tileRose: '#F0C3CF',
    tileBlush: '#F9DDE5',
    tilePeach: '#F2DDD5',
    tileBerry: '#D8A1B6',
    tileBadge: '#FFFFFF80',
    taskSurface: '#F8F1F4',
  },
  dark: {
    text: '#FCF6F7',
    background: '#191518',
    backgroundElement: '#241E22',
    backgroundSelected: '#33292F',
    textSecondary: '#B4A8AD',
    accent: '#F17D96',
    accentPressed: '#DC657F',
    accentSoft: '#38232D',
    onAccent: '#301520',
    border: '#33292E',
    tileRose: '#58303E',
    tileBlush: '#462C38',
    tilePeach: '#503631',
    tileBerry: '#65374F',
    tileBadge: '#FFFFFF18',
    taskSurface: '#292027',
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

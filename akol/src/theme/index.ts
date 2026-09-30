import type { JewelKey } from '../lib/types';

/** Akol's palette: midnight lacquer, gilt, and ivory, with jewel tones per family member. */
export const colors = {
  bg: '#07080F',
  bgRaised: '#0E1120',
  card: '#121629',
  cardHi: '#191E36',
  hairline: 'rgba(233, 196, 106, 0.18)',
  hairlineStrong: 'rgba(233, 196, 106, 0.42)',
  gold: '#E9C46A',
  goldDeep: '#B8893B',
  goldPale: '#F6E7B8',
  ivory: '#F5EFE0',
  text: '#F5EFE0',
  textDim: '#A9A392',
  textFaint: '#6B6759',
  success: '#5FD3A6',
  warning: '#F2A65A',
  danger: '#EF6F6C',
  overlay: 'rgba(4, 5, 10, 0.72)',
} as const;

export const gradients = {
  page: ['#0B0E1C', '#07080F', '#050509'] as const,
  gold: ['#F6E7B8', '#E9C46A', '#B8893B'] as const,
  goldSoft: ['rgba(233,196,106,0.10)', 'rgba(233,196,106,0)'] as const,
  card: ['#161B33', '#10132A'] as const,
};

export const jewels: Record<JewelKey, { name: string; base: string; light: string; deep: string }> = {
  topaz: { name: 'Topaz', base: '#E9C46A', light: '#F6E7B8', deep: '#8A6424' },
  sapphire: { name: 'Sapphire', base: '#5B8DEF', light: '#A9C4FA', deep: '#1E3F8A' },
  emerald: { name: 'Emerald', base: '#3FBF8F', light: '#9BE6C8', deep: '#16654A' },
  ruby: { name: 'Ruby', base: '#E0556B', light: '#F5A8B5', deep: '#7D1D2E' },
  amethyst: { name: 'Amethyst', base: '#A57BE8', light: '#D5C1F7', deep: '#4E2C8A' },
  pearl: { name: 'Pearl', base: '#D9D4C7', light: '#F5F2EA', deep: '#77705F' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

export const fonts = {
  display: 'PlayfairDisplay_700Bold',
  displayItalic: 'PlayfairDisplay_400Regular_Italic',
  displayMedium: 'PlayfairDisplay_500Medium',
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
} as const;

/** Playfair's default old-style figures make "7:00" read like "7:oo"; use lining numerals for data. */
export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;

export const familyJewel = { name: 'Family', base: colors.gold, light: colors.goldPale, deep: colors.goldDeep };

import type { JewelKey } from '../lib/types';

/**
 * Akol's palette: ebony and sika (gold), lit by a sunset glow, with kente-cloth
 * colours for each family member.
 */
export const colors = {
  bg: '#0E0907',
  bgRaised: '#1A110C',
  card: '#20150F',
  cardHi: '#2A1B12',
  hairline: 'rgba(242, 182, 50, 0.20)',
  hairlineStrong: 'rgba(242, 182, 50, 0.48)',
  gold: '#F2B632',
  goldDeep: '#B87A12',
  goldPale: '#FBE3A1',
  ivory: '#F7EEDD',
  text: '#F7EEDD',
  textDim: '#C2AF97',
  textFaint: '#80705F',
  success: '#3DBE7A',
  warning: '#F08A3C',
  danger: '#E8574A',
  overlay: 'rgba(8, 5, 4, 0.78)',
} as const;

/** Kente strip colours, in weaving order. */
export const kente = {
  gold: '#F2B632',
  green: '#1F9D55',
  red: '#C8102E',
  black: '#0E0907',
  indigo: '#2B3A8C',
  orange: '#E0661F',
} as const;

export const gradients = {
  page: ['#1C0F0A', '#0E0907', '#080504'] as const,
  /** Sunset over the savannah, behind the top of every screen. */
  glow: ['rgba(200,72,28,0.38)', 'rgba(242,182,50,0.07)', 'rgba(14,9,7,0)'] as const,
  gold: ['#FBE3A1', '#F2B632', '#B87A12'] as const,
  goldSoft: ['rgba(242,182,50,0.12)', 'rgba(242,182,50,0)'] as const,
  card: ['#2A1B12', '#1A110C'] as const,
  hero: ['#3A1A10', '#1E120C', '#140C08'] as const,
};

export const jewels: Record<JewelKey, { name: string; base: string; light: string; deep: string }> = {
  sika: { name: 'Sika Gold', base: '#F2B632', light: '#FBE3A1', deep: '#8A5A0C' },
  kente: { name: 'Kente Green', base: '#23A860', light: '#9FE3BD', deep: '#0F5A31' },
  maasai: { name: 'Maasai Red', base: '#D8342A', light: '#F7A79C', deep: '#7A140F' },
  adire: { name: 'Adire Indigo', base: '#4A61C9', light: '#AEBBF2', deep: '#1D2A6E' },
  terracotta: { name: 'Terracotta', base: '#E0661F', light: '#F8B98E', deep: '#7E3208' },
  malachite: { name: 'Malachite', base: '#15A39A', light: '#93E3DC', deep: '#0A5752' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto the kente palette. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'kente',
  ruby: 'maasai',
  sapphire: 'adire',
  amethyst: 'terracotta',
  pearl: 'malachite',
};

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

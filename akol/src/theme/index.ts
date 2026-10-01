import type { JewelKey } from '../lib/types';

/**
 * Akol "Side A": black and white, hip hop. The day is a record: routines are records, tasks
 * are tracks, the tonearm is now and Go time is showtime. Condensed poster type, marker tags,
 * and solid white panels for the moments that matter.
 */
export const colors = {
  bg: '#000000',
  bgRaised: '#0D0D0D',
  card: '#000000',
  cardHi: '#141414',
  hairline: 'rgba(255, 255, 255, 0.18)',
  hairlineStrong: '#FFFFFF',
  /** The accent is white: in this house, emphasis is contrast, not colour. */
  ink: '#FFFFFF',
  inkSoft: '#E6E6E6',
  inkDeep: '#BDBDBD',
  text: '#FFFFFF',
  textDim: 'rgba(255, 255, 255, 0.66)',
  textFaint: 'rgba(255, 255, 255, 0.38)',
  success: '#FFFFFF',
  warning: '#BDBDBD',
  danger: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.82)',
  wash: 'rgba(255, 255, 255, 0.07)',
  /** Text and marks that sit on a white panel. */
  onPaper: '#000000',
  lilac: '#FFFFFF',
} as const;

export const gradients = {
  page: ['#000000', '#000000'] as const,
  ink: ['#FFFFFF', '#FFFFFF'] as const,
  inkSoft: ['rgba(255,255,255,0)', 'rgba(255,255,255,0)'] as const,
  card: ['#000000', '#000000'] as const,
  sheen: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0)'] as const,
};

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Each family member's finish (like a record's pressing: platinum, pearl, chrome...), used for
 * their badge. Keys are kept from earlier releases so saved data still loads.
 */
export const jewels: Record<
  JewelKey,
  { name: string; style: SealStyle; hex: string; metal: number; base: string; light: string; deep: string }
> = {
  sika: { name: 'Platinum', style: 'solid', hex: '#FFFFFF', metal: 1, base: '#FFFFFF', light: '#FFFFFF', deep: '#9A9A9A' },
  kente: { name: 'Pearl', style: 'outline', hex: '#ECE9E2', metal: 0.25, base: '#ECE9E2', light: '#FFFFFF', deep: '#8F8C86' },
  adire: { name: 'Chrome', style: 'double', hex: '#D4D4D4', metal: 1, base: '#D4D4D4', light: '#FFFFFF', deep: '#7A7A7A' },
  maasai: { name: 'Gunmetal', style: 'heavy', hex: '#7E7E7E', metal: 1, base: '#7E7E7E', light: '#C8C8C8', deep: '#3A3A3A' },
  terracotta: { name: 'Smoke', style: 'dotted', hex: '#A8A8A8', metal: 0.5, base: '#A8A8A8', light: '#E0E0E0', deep: '#555555' },
  malachite: { name: 'Onyx', style: 'wash', hex: '#3C3C3C', metal: 0.9, base: '#3C3C3C', light: '#9A9A9A', deep: '#111111' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto finishes. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'malachite',
  ruby: 'maasai',
  sapphire: 'kente',
  amethyst: 'terracotta',
  pearl: 'adire',
};

export const fonts = {
  /** Condensed poster lettering, like a mixtape cover. */
  masthead: 'Anton_400Regular',
  display: 'Anton_400Regular',
  displayBold: 'Anton_400Regular',
  /** Hand-tagged marker for asides ("feat.", "a.m.", "ready"). */
  displayItalic: 'PermanentMarker_400Regular',
  displayMedium: 'ArchivoNarrow_700Bold',
  body: 'ArchivoNarrow_500Medium',
  light: 'ArchivoNarrow_400Regular',
  italic: 'PermanentMarker_400Regular',
  medium: 'ArchivoNarrow_600SemiBold',
  semibold: 'ArchivoNarrow_700Bold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Sharp panels, round seals and pills. */
export const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;

export const familyJewel = {
  name: 'Family',
  style: 'solid' as SealStyle,
  hex: '#FFFFFF',
  metal: 1,
  base: '#FFFFFF',
  light: '#FFFFFF',
  deep: '#9A9A9A',
};

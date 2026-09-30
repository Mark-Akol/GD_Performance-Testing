import type { JewelKey } from '../lib/types';

/**
 * Akol "Manga": black ink on white paper, drawn like a shōnen page. Heavy panel borders,
 * screentone, speed lines, impact bursts and katakana sound effects. There are no greys
 * except the ones screentone makes.
 */
export const colors = {
  bg: '#FFFFFF',
  bgRaised: '#F2F2F2',
  card: '#FFFFFF',
  cardHi: '#EDEDED',
  hairline: 'rgba(0, 0, 0, 0.16)',
  hairlineStrong: '#000000',
  ink: '#000000',
  inkSoft: '#2A2A2A',
  inkDeep: '#000000',
  text: '#000000',
  textDim: '#4D4D4D',
  textFaint: '#9A9A9A',
  success: '#000000',
  warning: '#4D4D4D',
  danger: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
  wash: 'rgba(0, 0, 0, 0.06)',
} as const;

export const gradients = {
  page: [colors.bg, colors.bg] as const,
  ink: [colors.ink, colors.ink] as const,
  inkSoft: ['rgba(0,0,0,0.05)', 'rgba(0,0,0,0)'] as const,
  card: [colors.card, colors.card] as const,
};

/** Panel border weights, like a manga artist's pens. */
export const stroke = { panel: 3, heavy: 4, line: 2, fine: 1 } as const;

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Each family member's "character" style: how their badge is inked. Keys are kept from
 * earlier releases so saved data still loads.
 */
export const jewels: Record<
  JewelKey,
  { name: string; style: SealStyle; tone: number; base: string; light: string; deep: string }
> = {
  sika: { name: 'Solid Ink', style: 'solid', tone: 0, base: '#000', light: '#000', deep: '#000' },
  kente: { name: 'Screentone', style: 'wash', tone: 0.5, base: '#000', light: '#000', deep: '#000' },
  adire: { name: 'Clean Line', style: 'outline', tone: 0, base: '#000', light: '#000', deep: '#000' },
  maasai: { name: 'Double Line', style: 'double', tone: 0, base: '#000', light: '#000', deep: '#000' },
  terracotta: { name: 'Fine Tone', style: 'dotted', tone: 0.3, base: '#000', light: '#000', deep: '#000' },
  malachite: { name: 'Heavy Ink', style: 'heavy', tone: 0, base: '#000', light: '#000', deep: '#000' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto ink styles. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'kente',
  ruby: 'maasai',
  sapphire: 'adire',
  amethyst: 'terracotta',
  pearl: 'malachite',
};

export const fonts = {
  /** Title-card lettering. Dela Gothic One carries katakana and kanji for the sound effects. */
  masthead: 'DelaGothicOne_400Regular',
  display: 'DelaGothicOne_400Regular',
  displayBold: 'DelaGothicOne_400Regular',
  displayItalic: 'ChakraPetch_700Bold_Italic',
  displayMedium: 'ChakraPetch_600SemiBold',
  body: 'ChakraPetch_500Medium',
  light: 'ChakraPetch_400Regular',
  italic: 'ChakraPetch_500Medium_Italic',
  medium: 'ChakraPetch_600SemiBold',
  semibold: 'ChakraPetch_700Bold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 0, md: 0, lg: 0, pill: 0 } as const;

/** The slant used on buttons, chips and caption tabs. */
export const SLANT = '-10deg';

export const familyJewel = {
  name: 'Family',
  style: 'solid' as SealStyle,
  tone: 0,
  base: colors.ink,
  light: colors.ink,
  deep: colors.inkDeep,
};

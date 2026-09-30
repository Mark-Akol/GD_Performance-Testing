import type { JewelKey } from '../lib/types';

/**
 * Akol "Dial": black and white only, where a watch dial meets a fashion magazine.
 * High-contrast Didone numerals, hairlines, and the occasional solid black panel.
 */
export const colors = {
  bg: '#FBFBF9',
  bgRaised: '#F1F1EE',
  card: '#FBFBF9',
  cardHi: '#EFEFEC',
  hairline: 'rgba(10, 10, 10, 0.14)',
  hairlineStrong: 'rgba(10, 10, 10, 0.9)',
  ink: '#0A0A0A',
  inkSoft: '#3B3B3B',
  inkDeep: '#000000',
  text: '#0A0A0A',
  textDim: '#5C5C5C',
  textFaint: '#9A9A96',
  success: '#0A0A0A',
  warning: '#5C5C5C',
  danger: '#0A0A0A',
  overlay: 'rgba(10, 10, 10, 0.6)',
  wash: 'rgba(10, 10, 10, 0.045)',
} as const;

export const gradients = {
  page: [colors.bg, colors.bg] as const,
  ink: [colors.ink, colors.ink] as const,
  inkSoft: ['rgba(10,10,10,0.04)', 'rgba(10,10,10,0)'] as const,
  card: [colors.card, colors.card] as const,
};

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Each family member gets a line style instead of a colour. It is used for their seal
 * (avatar) and for their orbit on the Dial. Keys are kept from earlier releases so saved
 * data still loads.
 */
export const jewels: Record<
  JewelKey,
  { name: string; style: SealStyle; dash?: string; width: number; base: string; light: string; deep: string }
> = {
  sika: { name: 'Solid', style: 'solid', width: 2.2, base: '#0A0A0A', light: '#0A0A0A', deep: '#000' },
  kente: { name: 'Double', style: 'double', width: 1, base: '#0A0A0A', light: '#0A0A0A', deep: '#000' },
  adire: { name: 'Hairline', style: 'outline', width: 1, base: '#0A0A0A', light: '#0A0A0A', deep: '#000' },
  maasai: { name: 'Dashed', style: 'wash', dash: '6 4', width: 1.4, base: '#5C5C5C', light: '#0A0A0A', deep: '#3B3B3B' },
  terracotta: { name: 'Dotted', style: 'dotted', dash: '1 4', width: 2, base: '#0A0A0A', light: '#0A0A0A', deep: '#000' },
  malachite: { name: 'Heavy', style: 'heavy', width: 3.5, base: '#0A0A0A', light: '#0A0A0A', deep: '#000' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto line styles. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'kente',
  ruby: 'maasai',
  sapphire: 'adire',
  amethyst: 'terracotta',
  pearl: 'malachite',
};

export const fonts = {
  /** The wordmark and oversized numerals. */
  masthead: 'BodoniModa_400Regular_Italic',
  display: 'BodoniModa_500Medium',
  displayBold: 'BodoniModa_700Bold',
  displayItalic: 'BodoniModa_400Regular_Italic',
  displayMedium: 'BodoniModa_400Regular',
  body: 'Jost_400Regular',
  light: 'Jost_300Light',
  italic: 'BodoniModa_400Regular_Italic',
  medium: 'Jost_500Medium',
  semibold: 'Jost_600SemiBold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Square panels, round controls. */
export const radius = { sm: 0, md: 0, lg: 0, pill: 999 } as const;

export const familyJewel = {
  name: 'Family',
  style: 'solid' as SealStyle,
  width: 2,
  dash: undefined as string | undefined,
  base: colors.ink,
  light: colors.ink,
  deep: colors.inkDeep,
};

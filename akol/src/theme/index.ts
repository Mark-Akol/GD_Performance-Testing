import type { ViewStyle } from 'react-native';

import type { JewelKey } from '../lib/types';

/** The one colour for the moments that matter: alarms, Go time, "now", selections. */
const ACCENTS = {
  babyBlue: { accent: '#8ED1FC', accentStrong: '#52B4F2', accentInk: '#1673B8', accentSoft: '#E6F5FE' },
  royalMint: { accent: '#7EE0BF', accentStrong: '#2EC495', accentInk: '#0B8763', accentSoft: '#E0F8EF' },
} as const;
export type AccentName = keyof typeof ACCENTS;
export const ACCENT: AccentName = 'royalMint';
const A = ACCENTS[ACCENT];

/**
 * Akol "Side B": warm, light and calm, with one fresh colour for the moments that matter.
 *
 * Borrowed from the best of the field: Tiimo's soft colour-block timeline, Routinery's big
 * countdown ring, Cozi's colour for each family member, Brili's stars for the kids and
 * an accent (baby blue or royal mint) for alarms and Go time. The black Akol mark and the marker-pen
 * tagline keep the hip hop edge.
 */
export const colors = {
  bg: '#F6F3EE',
  bgRaised: '#EFEAE2',
  card: '#FFFFFF',
  cardHi: '#FBF9F6',
  hairline: 'rgba(22, 21, 26, 0.08)',
  hairlineStrong: 'rgba(22, 21, 26, 0.18)',
  /** Primary buttons and strong marks. */
  ink: '#16151A',
  inkSoft: '#3A3842',
  inkDeep: '#000000',
  text: '#16151A',
  textDim: '#6B6875',
  textFaint: '#A3A0AA',
  /** Fills: buttons, Go time, progress, ticks. Light, so text on it is ink. */
  accent: A.accent,
  /** Borders, gradient ends and small marks. */
  accentStrong: A.accentStrong,
  /** Text and icons in the accent, on the light page. */
  accentInk: A.accentInk,
  /** Selected backgrounds. */
  accentSoft: A.accentSoft,
  /** Text on an accent fill. */
  onAccent: '#16151A',
  dangerSoft: '#FDE7E8',
  success: '#1FA971',
  successSoft: '#DDF4E9',
  warning: '#F2A007',
  danger: '#E5484D',
  overlay: 'rgba(22, 21, 26, 0.45)',
  wash: 'rgba(22, 21, 26, 0.04)',
  /** Text and marks that sit on an ink surface. */
  onPaper: '#FFFFFF',
  star: '#FFB020',
} as const;

export const gradients = {
  page: [colors.bg, colors.bg] as const,
  ink: [colors.ink, colors.inkSoft] as const,
  inkSoft: ['rgba(22,21,26,0)', 'rgba(22,21,26,0)'] as const,
  card: [colors.card, colors.card] as const,
  sheen: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)'] as const,
};

/** Soft, low shadows that lift white cards off the warm page. */
export const shadow: ViewStyle = {
  shadowColor: '#3A2E1F',
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Each family member's colour: `base` for their badge and ticks, `tint` for their blocks on
 * the timeline. Keys are kept from earlier releases so saved data still loads.
 */
export const jewels: Record<
  JewelKey,
  { name: string; style: SealStyle; hex: string; metal: number; base: string; light: string; deep: string; tint: string }
> = {
  sika: { name: 'Sunshine', style: 'solid', hex: '#FFB020', metal: 0, base: '#FFB020', light: '#FFD47A', deep: '#C98400', tint: '#FFF3D9' },
  kente: { name: 'Sky', style: 'solid', hex: '#3E8EF7', metal: 0, base: '#3E8EF7', light: '#8DBCFA', deep: '#1F66C4', tint: '#E4EFFE' },
  adire: { name: 'Grape', style: 'solid', hex: '#7C5CFA', metal: 0, base: '#7C5CFA', light: '#B3A0FC', deep: '#5435D6', tint: '#EEE9FE' },
  maasai: { name: 'Berry', style: 'solid', hex: '#E8508F', metal: 0, base: '#E8508F', light: '#F497BD', deep: '#B92E68', tint: '#FCE7F0' },
  terracotta: { name: 'Lagoon', style: 'solid', hex: '#14B8A6', metal: 0, base: '#14B8A6', light: '#6FD9CC', deep: '#0C8A7C', tint: '#DEF6F3' },
  malachite: { name: 'Tangerine', style: 'solid', hex: '#FF8A3D', metal: 0, base: '#FF8A3D', light: '#FFB988', deep: '#D9661C', tint: '#FFEDE0' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto today's colours. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'malachite',
  ruby: 'maasai',
  sapphire: 'kente',
  amethyst: 'adire',
  pearl: 'terracotta',
};

export const fonts = {
  masthead: 'Nunito_900Black',
  display: 'Nunito_900Black',
  displayBold: 'Nunito_800ExtraBold',
  /** Hand-tagged marker, kept for the tagline and the odd aside. */
  displayItalic: 'PermanentMarker_400Regular',
  displayMedium: 'Nunito_800ExtraBold',
  body: 'Nunito_600SemiBold',
  light: 'Nunito_500Medium',
  italic: 'PermanentMarker_400Regular',
  medium: 'Nunito_700Bold',
  semibold: 'Nunito_800ExtraBold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Soft, friendly corners. */
export const radius = { sm: 10, md: 14, lg: 22, pill: 999 } as const;

/** Whole-family items (like Go time) wear the accent. */
export const familyJewel = {
  name: 'Family',
  style: 'solid' as SealStyle,
  hex: colors.accentStrong,
  metal: 0,
  base: colors.accentStrong,
  light: colors.accent,
  deep: colors.accentInk,
  tint: colors.accentSoft,
};

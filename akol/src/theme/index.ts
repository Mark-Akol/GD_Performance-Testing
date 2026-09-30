import type { JewelKey } from '../lib/types';

/**
 * Akol's palette: a 1920s broadsheet. Black ink on newsprint, nothing else.
 * Emphasis comes from weight, italics, capitals, rules and reversed (white-on-black) type.
 */
export const colors = {
  bg: '#F3EFE4', // newsprint
  bgRaised: '#EBE6D8',
  card: '#F3EFE4',
  cardHi: '#E8E2D2',
  hairline: 'rgba(20, 20, 20, 0.22)',
  hairlineStrong: 'rgba(20, 20, 20, 0.85)',
  ink: '#141414',
  inkSoft: '#3A3833',
  inkDeep: '#000000',
  text: '#141414',
  textDim: '#4A4740',
  textFaint: '#86806F',
  success: '#141414',
  warning: '#4A4740',
  danger: '#141414',
  overlay: 'rgba(20, 20, 20, 0.55)',
  wash: 'rgba(20, 20, 20, 0.05)',
} as const;

export const gradients = {
  page: [colors.bg, colors.bg] as const,
  ink: [colors.ink, colors.ink] as const,
  inkSoft: ['rgba(20,20,20,0.04)', 'rgba(20,20,20,0)'] as const,
  card: [colors.card, colors.card] as const,
};

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Member "seals": each family member gets a distinct engraving style for their
 * monogram rather than a colour. The keys are kept from earlier releases so saved
 * data still loads.
 */
export const jewels: Record<JewelKey, { name: string; style: SealStyle; base: string; light: string; deep: string }> = {
  sika: { name: 'Solid Ink', style: 'solid', base: '#141414', light: '#141414', deep: '#000000' },
  adire: { name: 'Outline', style: 'outline', base: '#141414', light: '#141414', deep: '#000000' },
  kente: { name: 'Double Rule', style: 'double', base: '#141414', light: '#141414', deep: '#000000' },
  maasai: { name: 'Grey Wash', style: 'wash', base: '#5E5A51', light: '#141414', deep: '#3A3833' },
  terracotta: { name: 'Dotted', style: 'dotted', base: '#3A3833', light: '#141414', deep: '#141414' },
  malachite: { name: 'Heavy Ring', style: 'heavy', base: '#141414', light: '#141414', deep: '#000000' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto seals. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'kente',
  ruby: 'maasai',
  sapphire: 'adire',
  amethyst: 'terracotta',
  pearl: 'malachite',
};

export const fonts = {
  masthead: 'UnifrakturMaguntia_400Regular',
  display: 'OldStandardTT_700Bold',
  displayItalic: 'OldStandardTT_400Regular_Italic',
  displayMedium: 'OldStandardTT_400Regular',
  body: 'LibreCaslonText_400Regular',
  italic: 'LibreCaslonText_400Regular_Italic',
  medium: 'LibreCaslonText_400Regular',
  semibold: 'LibreCaslonText_700Bold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
/** Newspapers don't round corners; a hair of radius keeps edges from looking broken on screen. */
export const radius = { sm: 2, md: 2, lg: 2, pill: 2 } as const;

export const familyJewel = { name: 'Family', style: 'solid' as SealStyle, base: colors.ink, light: colors.ink, deep: colors.inkDeep };

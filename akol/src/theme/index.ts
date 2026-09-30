import type { JewelKey } from '../lib/types';

/**
 * Akol "Orrery": obsidian night, champagne gold, pearl type and dark glass panels over a
 * live 3D scene. Each family member is a precious metal or gem.
 */
export const colors = {
  bg: '#07060A',
  bgRaised: '#100E16',
  card: 'rgba(255, 250, 240, 0.045)',
  cardHi: 'rgba(255, 250, 240, 0.08)',
  hairline: 'rgba(255, 236, 200, 0.12)',
  hairlineStrong: 'rgba(255, 226, 170, 0.42)',
  ink: '#E8C78A',
  inkSoft: '#F6E3BA',
  inkDeep: '#B8894A',
  text: '#F4EFE8',
  textDim: 'rgba(244, 239, 232, 0.64)',
  textFaint: 'rgba(244, 239, 232, 0.38)',
  success: '#9BE2C0',
  warning: '#F0B774',
  danger: '#F0857A',
  overlay: 'rgba(4, 3, 8, 0.72)',
  wash: 'rgba(232, 199, 138, 0.08)',
  /** Cool counter-light used for depth. */
  lilac: '#9C8CFF',
} as const;

export const gradients = {
  page: ['#120E1C', '#07060A', '#040306'] as const,
  ink: ['#FFE9BD', '#E8C78A', '#B8894A'] as const,
  inkSoft: ['rgba(232,199,138,0.07)', 'rgba(232,199,138,0)'] as const,
  card: ['rgba(255,250,240,0.075)', 'rgba(255,250,240,0.025)'] as const,
  sheen: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)'] as const,
};

export type SealStyle = 'solid' | 'outline' | 'double' | 'wash' | 'dotted' | 'heavy';

/**
 * Each family member's metal or gem. `hex` colours their ring and beads in the 3D scene
 * and their accents in the UI. Keys are kept from earlier releases so saved data still loads.
 */
export const jewels: Record<
  JewelKey,
  { name: string; style: SealStyle; hex: string; metal: number; base: string; light: string; deep: string }
> = {
  sika: { name: 'Gold', style: 'solid', hex: '#E8C78A', metal: 1, base: '#E8C78A', light: '#FFE9BD', deep: '#8A6424' },
  kente: { name: 'Platinum', style: 'solid', hex: '#DCE3EE', metal: 1, base: '#DCE3EE', light: '#FFFFFF', deep: '#7D8696' },
  adire: { name: 'Rose Gold', style: 'solid', hex: '#E9A995', metal: 1, base: '#E9A995', light: '#FFD6C8', deep: '#8E5243' },
  maasai: { name: 'Garnet', style: 'solid', hex: '#C4475A', metal: 0.3, base: '#C4475A', light: '#F29AA6', deep: '#5E1422' },
  terracotta: { name: 'Amethyst', style: 'solid', hex: '#A98BF2', metal: 0.3, base: '#A98BF2', light: '#D8C9FF', deep: '#4B3290' },
  malachite: { name: 'Jade', style: 'solid', hex: '#62C4A2', metal: 0.3, base: '#62C4A2', light: '#B5F0DB', deep: '#1D6450' },
};

export const JEWEL_KEYS = Object.keys(jewels) as JewelKey[];

/** Colour keys from the first release, mapped onto metals and gems. */
export const LEGACY_JEWELS: Record<string, JewelKey> = {
  topaz: 'sika',
  emerald: 'malachite',
  ruby: 'maasai',
  sapphire: 'kente',
  amethyst: 'terracotta',
  pearl: 'adire',
};

export const fonts = {
  masthead: 'CormorantGaramond_300Light_Italic',
  display: 'CormorantGaramond_500Medium',
  displayBold: 'CormorantGaramond_600SemiBold',
  displayItalic: 'CormorantGaramond_400Regular_Italic',
  displayMedium: 'CormorantGaramond_500Medium',
  body: 'Manrope_400Regular',
  light: 'Manrope_300Light',
  italic: 'CormorantGaramond_400Regular_Italic',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
} as const;

export const lining = { fontVariant: ['lining-nums' as const] };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 12, md: 18, lg: 26, pill: 999 } as const;

export const familyJewel = {
  name: 'Family',
  style: 'solid' as SealStyle,
  hex: '#FFE9BD',
  metal: 1,
  base: '#E8C78A',
  light: '#FFE9BD',
  deep: '#B8894A',
};

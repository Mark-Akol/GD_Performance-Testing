/**
 * Slow Burn design tokens.
 *
 * The brief was "opulent". That is read here as restraint, not ornament:
 * a near-black canvas, one warm ember accent that only ever marks the thing
 * you should do next, and a muted brass reserved for earned status (streaks,
 * milestones). Nothing else gets to be colourful, which is what makes the
 * ember read as expensive rather than loud.
 *
 * Every colour the app uses lives here. Renaming or re-theming the product
 * should never require touching a screen file.
 */

export const palette = {
  /** Page canvas. Warmer than pure black so OLED panels don't look dead. */
  void: '#08070A',
  /** Raised surface: cards, sheets, list rows. */
  surface: '#111015',
  /** Surface one step higher: modals, pressed states. */
  surfaceRaised: '#1A181F',
  /** Hairline dividers and card borders. */
  hairline: '#25222C',

  textPrimary: '#F5F3F0',
  textSecondary: '#9C97A6',
  textTertiary: '#615C6B',

  /** The ember. Reserved for the single next action and active progress. */
  ember: '#FF5A1F',
  emberDim: '#B33C12',
  emberGlow: 'rgba(255, 90, 31, 0.16)',

  /** Brass. Earned status only: streaks, badges, circle leaderboard crown. */
  brass: '#C9A227',
  brassDim: '#6B5714',

  success: '#3FBF7F',
  warning: '#E8B931',
  danger: '#E5484D',

  /** Per-domain identity, used sparingly (icons, rings) to aid scanning. */
  hydration: '#4CC3E0',
  nutrition: '#8FBF3F',
  movement: '#C77DFF',
  screen: '#E0A24C',
  training: '#FF5A1F',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Type scale. Deliberately few steps — an opulent interface is one where
 * the hierarchy is obvious, not one with fourteen font sizes.
 */
export const type = {
  display: { fontSize: 48, lineHeight: 52, fontWeight: '200' },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** Wide-tracked micro caps for section eyebrows. */
  eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.6 },
} as const;

export const theme = { palette, spacing, radius, type } as const;
export type Theme = typeof theme;

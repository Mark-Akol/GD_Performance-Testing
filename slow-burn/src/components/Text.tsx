import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { palette, type as typeScale } from '@/theme/tokens';

type Variant = keyof typeof typeScale;
type Tone = 'primary' | 'secondary' | 'tertiary' | 'ember' | 'brass' | 'danger' | 'success';

const TONES: Record<Tone, string> = {
  primary: palette.textPrimary,
  secondary: palette.textSecondary,
  tertiary: palette.textTertiary,
  ember: palette.ember,
  brass: palette.brass,
  danger: palette.danger,
  success: palette.success,
};

interface Props extends TextProps {
  variant?: Variant;
  tone?: Tone;
}

/**
 * The only text primitive in the app. Screens pick a variant and a tone rather
 * than inventing font sizes, which is what keeps the type hierarchy tight
 * enough to read as considered rather than assembled.
 */
export function Text({ variant = 'body', tone = 'primary', style, ...rest }: Props) {
  const base = typeScale[variant] as TextStyle;
  return <RNText {...rest} style={[base, { color: TONES[tone] }, style]} />;
}

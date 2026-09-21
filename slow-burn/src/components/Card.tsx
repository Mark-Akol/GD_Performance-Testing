import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  /** Raises the surface and warms the border — used for the next action. */
  highlighted?: boolean;
}

export function Card({ children, style, highlighted = false }: Props) {
  return (
    <View style={[styles.card, highlighted && styles.highlighted, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
    padding: spacing.lg,
  },
  highlighted: {
    backgroundColor: palette.surfaceRaised,
    borderColor: palette.emberDim,
  },
});

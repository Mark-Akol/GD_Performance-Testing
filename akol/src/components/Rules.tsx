import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';

const FADE = ['rgba(232,199,138,0)', 'rgba(232,199,138,0.55)', 'rgba(232,199,138,0)'] as const;

/** A gold hairline that fades out at both ends. */
export function Rule({ style }: { weight?: number; style?: StyleProp<ViewStyle> }) {
  return <LinearGradient colors={FADE} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[{ height: 1, alignSelf: 'stretch' }, style]} />;
}

export function DoubleRule({ style }: { inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 3, alignSelf: 'stretch' }, style]}>
      <Rule />
      <Rule />
    </View>
  );
}

/** Hairline — ◆ — hairline */
export function Fleuron({ style }: { glyph?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fleuron, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rule style={{ flex: 1 }} />
      <View style={styles.gem} />
      <Rule style={{ flex: 1 }} />
    </View>
  );
}

export function Dingbat() {
  return <View style={styles.gem} />;
}

const styles = StyleSheet.create({
  fleuron: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  gem: { width: 6, height: 6, backgroundColor: colors.ink, transform: [{ rotate: '45deg' }] },
});

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, SLANT, stroke } from '../theme';

/** A single inked rule. */
export function Rule({ weight = stroke.line, style }: { weight?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: weight, backgroundColor: colors.ink, alignSelf: 'stretch' }, style]} />;
}

/** Heavy over fine, like the top of a manga page. */
export function DoubleRule({ style }: { inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.double, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rule weight={stroke.heavy} />
      <Rule weight={stroke.fine} />
    </View>
  );
}

/** A heavy rule broken by three slanted blocks: ▰▰▰ */
export function Fleuron({ style }: { glyph?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fleuron, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.hair} />
      <View style={styles.blocks}>
        <View style={styles.block} />
        <View style={styles.block} />
        <View style={styles.block} />
      </View>
      <View style={styles.hair} />
    </View>
  );
}

/** A small slanted ink block that leads a label. */
export function Dingbat() {
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  double: { gap: 3, alignSelf: 'stretch' },
  fleuron: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  hair: { flex: 1, height: stroke.line, backgroundColor: colors.ink },
  blocks: { flexDirection: 'row', gap: 4 },
  block: { width: 10, height: 8, backgroundColor: colors.ink, transform: [{ skewX: SLANT }] },
  dot: { width: 8, height: 10, backgroundColor: colors.ink, transform: [{ skewX: SLANT }] },
});

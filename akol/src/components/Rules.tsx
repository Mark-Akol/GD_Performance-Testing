import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme';

/** A single hairline (or heavier) rule. */
export function Rule({ weight = StyleSheet.hairlineWidth * 2, style }: { weight?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: weight, backgroundColor: colors.ink, alignSelf: 'stretch' }, style]} />;
}

/** Two hairlines close together, like the bezel edge of a watch. */
export function DoubleRule({ style }: { inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.double, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rule weight={1} />
      <Rule weight={1} />
    </View>
  );
}

/** A hairline broken by a small open circle: the dial's pivot. */
export function Fleuron({ style }: { glyph?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fleuron, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.hair} />
      <View style={styles.pivot} />
      <View style={styles.hair} />
    </View>
  );
}

/** The small filled dot that leads section labels. */
export function Dingbat() {
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  double: { gap: 3, alignSelf: 'stretch' },
  fleuron: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  hair: { flex: 1, height: 1, backgroundColor: colors.ink },
  pivot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: colors.ink },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.ink },
});

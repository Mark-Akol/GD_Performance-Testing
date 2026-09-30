import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts } from '../theme';

/** A single printed rule. */
export function Rule({ weight = 1, style }: { weight?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: weight, backgroundColor: colors.ink, alignSelf: 'stretch' }, style]} />;
}

/** The broadsheet's thick-over-thin rule, as under a masthead. */
export function DoubleRule({ inverted, style }: { inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.double, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Rule weight={inverted ? 1 : 3} />
      <Rule weight={inverted ? 3 : 1} />
    </View>
  );
}

/** A centred printer's ornament between two hairlines: ——— ❦ ——— */
export function Fleuron({ glyph = '❦', style }: { glyph?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.fleuron, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.hair} />
      <Text style={styles.glyph}>{glyph}</Text>
      <View style={styles.hair} />
    </View>
  );
}

/** Small typographic mark used before section labels. */
export function Dingbat({ glyph = '§' }: { glyph?: string }) {
  return <Text style={styles.dingbat}>{glyph}</Text>;
}

const styles = StyleSheet.create({
  double: { gap: 2, alignSelf: 'stretch' },
  fleuron: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  hair: { flex: 1, height: StyleSheet.hairlineWidth * 2, backgroundColor: colors.ink },
  glyph: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  dingbat: { fontFamily: fonts.display, fontSize: 13, color: colors.ink },
});

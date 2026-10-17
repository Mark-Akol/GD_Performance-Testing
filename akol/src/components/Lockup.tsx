import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export const TAGLINE = 'just a-call away';

/** The Akol mark with the tagline tagged beside it. The mark carries the name. */
export function Lockup({ size = 64 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={`Akol, ${TAGLINE}`}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.23, borderWidth: 1, borderColor: colors.hairline }}
        accessibilityIgnoresInvertColors
      />
      <Text style={[styles.tag, { fontSize: Math.max(15, size * 0.36) }]}>{TAGLINE}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  tag: { fontFamily: fonts.italic, color: colors.text, transform: [{ rotate: '-4deg' }] },
});

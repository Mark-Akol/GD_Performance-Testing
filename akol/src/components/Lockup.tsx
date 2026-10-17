import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../theme';

export const TAGLINE = 'just a-call away';

/** The Akol mark with the wordmark beside it, and the tagline tagged underneath. */
export function Lockup({ size = 64, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel={`Akol${tagline ? `, ${TAGLINE}` : ''}`}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size, borderRadius: size * 0.23, borderWidth: 1, borderColor: colors.hairline }}
        accessibilityIgnoresInvertColors
      />
      <View>
        <Text style={[styles.word, { fontSize: size * 0.62, lineHeight: size * 0.7, letterSpacing: size * 0.08 }]}>
          AKOL
        </Text>
        {tagline && <Text style={[styles.tag, { fontSize: Math.max(12, size * 0.22) }]}>{TAGLINE}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  word: { fontFamily: fonts.display, color: colors.text },
  tag: { fontFamily: fonts.italic, color: colors.text, transform: [{ rotate: '-3deg' }], marginTop: 2 },
});

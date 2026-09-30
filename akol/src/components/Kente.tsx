import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { kente } from '../theme';

/**
 * One repeat of a kente strip: broad gold and green blocks split by black warp
 * lines, with red and indigo accents. Widths are relative.
 */
const REPEAT: [string, number][] = [
  [kente.gold, 10],
  [kente.black, 2],
  [kente.green, 6],
  [kente.black, 2],
  [kente.red, 3],
  [kente.gold, 2],
  [kente.red, 3],
  [kente.black, 2],
  [kente.gold, 10],
  [kente.black, 2],
  [kente.indigo, 5],
  [kente.black, 2],
  [kente.orange, 2],
  [kente.black, 2],
];

/** A woven band: two rows of the kente repeat, the second offset like a weft. */
export function KenteBand({
  height = 8,
  repeats = 8,
  style,
}: {
  height?: number;
  repeats?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const row = (offset: number) => (
    <View style={[styles.row, { height: height / 2 }]}>
      {Array.from({ length: repeats }).flatMap((_, r) =>
        REPEAT.map((_, i) => {
          const [color, flex] = REPEAT[(i + offset) % REPEAT.length];
          return <View key={`${r}-${i}`} style={{ flex, backgroundColor: color }} />;
        }),
      )}
    </View>
  );
  return (
    <View style={[styles.band, { height }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {row(0)}
      {row(7)}
    </View>
  );
}

/** A small diamond ornament, like the lozenges woven into kente and Ndebele work. */
export function Lozenge({ size = 8, color = kente.gold }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size, height: size, backgroundColor: color, transform: [{ rotate: '45deg' }] }}>
        <View style={{ position: 'absolute', top: size * 0.3, left: size * 0.3, width: size * 0.4, height: size * 0.4, backgroundColor: kente.black }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  band: { overflow: 'hidden', width: '100%' },
  row: { flexDirection: 'row' },
});

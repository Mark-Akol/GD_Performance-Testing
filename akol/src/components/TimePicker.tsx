import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { parseTime, toClockTime } from '../lib/schedule';
import type { ClockTime } from '../lib/types';
import { colors, fonts, lining, radius, space } from '../theme';
import { tap } from './ui';

/** Hour / minute / am-pm steppers. Works identically on iOS, Android and web. */
export function TimePicker({ value, onChange }: { value: ClockTime; onChange: (t: ClockTime) => void }) {
  const mins = parseTime(value);
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const pm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;

  const set = (total: number) => {
    tap();
    onChange(toClockTime(total));
  };
  const stepMinute = (dir: 1 | -1) => {
    // Snap to the 5-minute grid, then keep stepping by 5.
    const snapped = dir > 0 ? Math.floor(m / 5) * 5 + 5 : Math.ceil(m / 5) * 5 - 5;
    set(h24 * 60 + snapped);
  };

  return (
    <View style={styles.wrap}>
      <Column
        label={String(h12)}
        onUp={() => set(mins + 60)}
        onDown={() => set(mins - 60)}
        a11y="hour"
      />
      <Text style={styles.colon}>:</Text>
      <Column
        label={String(m).padStart(2, '0')}
        onUp={() => stepMinute(1)}
        onDown={() => stepMinute(-1)}
        onFineUp={() => set(mins + 1)}
        onFineDown={() => set(mins - 1)}
        a11y="minute"
      />
      <View style={styles.ampm}>
        {(['am', 'pm'] as const).map((k) => {
          const active = (k === 'pm') === pm;
          return (
            <Pressable
              key={k}
              onPress={() => !active && set(mins + (pm ? -720 : 720))}
              style={[styles.ampmBtn, active && styles.ampmActive]}
            >
              <Text style={[styles.ampmText, active && { color: colors.bg }]}>{k.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Column({
  label,
  onUp,
  onDown,
  onFineUp,
  onFineDown,
  a11y,
}: {
  label: string;
  onUp: () => void;
  onDown: () => void;
  onFineUp?: () => void;
  onFineDown?: () => void;
  a11y: string;
}) {
  return (
    <View style={styles.col}>
      <Pressable accessibilityLabel={`Increase ${a11y}`} onPress={onUp} onLongPress={onFineUp} hitSlop={8} style={styles.arrow}>
        <Ionicons name="chevron-up" size={22} color={colors.ink} />
      </Pressable>
      <Text style={styles.value}>{label}</Text>
      <Pressable accessibilityLabel={`Decrease ${a11y}`} onPress={onDown} onLongPress={onFineDown} hitSlop={8} style={styles.arrow}>
        <Ionicons name="chevron-down" size={22} color={colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  col: { alignItems: 'center', width: 76 },
  arrow: { padding: 6 },
  value: { fontFamily: fonts.display, fontSize: 48, color: colors.text, lineHeight: 58, ...lining },
  colon: { fontFamily: fonts.display, fontSize: 44, color: colors.ink, marginBottom: 6 },
  ampm: { marginLeft: space.md, gap: space.sm },
  ampmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  ampmActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  ampmText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim, letterSpacing: 1 },
});

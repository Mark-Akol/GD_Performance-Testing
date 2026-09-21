import { Pressable, StyleSheet, View } from 'react-native';
import { palette, radius, spacing } from '@/theme/tokens';
import { Text } from './Text';

interface Option<T> {
  value: T;
  label: string;
  hint?: string;
}

interface Props<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Vertical single-select. Used throughout onboarding and settings. */
export function Choice<T extends string | number>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            style={({ pressed }) => [
              styles.option,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.body}>
              <Text variant="label" tone={selected ? 'primary' : 'secondary'}>
                {option.label}
              </Text>
              {option.hint ? (
                <Text variant="caption" tone="tertiary">
                  {option.hint}
                </Text>
              ) : null}
            </View>
            <View style={[styles.dot, selected && styles.dotOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  selected: { backgroundColor: palette.surfaceRaised, borderColor: palette.emberDim },
  pressed: { opacity: 0.85 },
  body: { flex: 1, gap: 2 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: palette.textTertiary,
  },
  dotOn: { borderColor: palette.ember, backgroundColor: palette.ember },
});

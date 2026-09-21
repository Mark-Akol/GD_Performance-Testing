import { StyleSheet, View } from 'react-native';
import { palette, spacing } from '@/theme/tokens';
import { Text } from './Text';

interface Props {
  /** 0-100. */
  score: number;
  size?: number;
  caption?: string;
}

/**
 * The day's completion, drawn as a ring of segments rather than a smooth arc.
 *
 * Segments are pure Views — no SVG dependency, no native module, nothing to
 * break on an OS upgrade. They also read better than a continuous bar here:
 * a habit day is a countable number of discrete acts, and the eye can tell
 * "three left" at a glance in a way it cannot from 78%.
 */
export function BurnRing({ score, size = 180, caption }: Props) {
  const segments = 24;
  const lit = Math.round((clamp(score) / 100) * segments);
  const radius = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {Array.from({ length: segments }).map((_, i) => {
        const angle = (i / segments) * 2 * Math.PI - Math.PI / 2;
        const isLit = i < lit;
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: isLit ? palette.ember : palette.hairline,
                opacity: isLit ? 0.5 + 0.5 * (i / segments) : 1,
                transform: [
                  { translateX: Math.cos(angle) * (radius - 8) },
                  { translateY: Math.sin(angle) * (radius - 8) },
                  { rotate: `${angle + Math.PI / 2}rad` },
                ],
              },
            ]}
          />
        );
      })}

      <View style={styles.center}>
        <Text variant="display" tone={score > 0 ? 'primary' : 'tertiary'}>
          {clamp(score)}
        </Text>
        {caption ? (
          <Text variant="eyebrow" tone="tertiary" style={styles.caption}>
            {caption.toUpperCase()}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  segment: {
    position: 'absolute',
    width: 3,
    height: 14,
    borderRadius: 2,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  caption: { marginTop: spacing.xs },
});

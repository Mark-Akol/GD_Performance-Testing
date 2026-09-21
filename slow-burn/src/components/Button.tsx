import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, radius, spacing, type } from '@/theme/tokens';
import { Text } from './Text';

type Variant = 'ember' | 'quiet' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  full?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'ember',
  disabled = false,
  loading = false,
  full = true,
}: Props) {
  const inactive = disabled || loading;

  const handlePress = () => {
    if (inactive) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const content = loading ? (
    <ActivityIndicator color={variant === 'ember' ? palette.void : palette.textPrimary} />
  ) : (
    <Text
      variant="label"
      tone={variant === 'ember' ? 'primary' : 'secondary'}
      style={[styles.label, variant === 'ember' && styles.emberLabel]}
    >
      {label}
    </Text>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        full && styles.full,
        pressed && !inactive && styles.pressed,
        inactive && styles.disabled,
      ]}
    >
      {variant === 'ember' ? (
        <LinearGradient
          colors={[palette.ember, palette.emberDim]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, variant === 'quiet' ? styles.quiet : styles.ghost]}>
          {content}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, overflow: 'hidden' },
  full: { alignSelf: 'stretch' },
  fill: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  quiet: {
    backgroundColor: palette.surfaceRaised,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.hairline,
  },
  ghost: { backgroundColor: 'transparent' },
  label: { ...type.label, letterSpacing: 0.3 },
  emberLabel: { color: '#1A0A02', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});

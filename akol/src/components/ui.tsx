import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, gradients, radius, shadow, space } from '../theme';
import { Fleuron } from './Rules';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else
    Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
}

/** Glass needs something behind it: on web, blur what's underneath. */
const glassBlur: ViewStyle = Platform.OS === 'web' ? ({ backdropFilter: 'blur(18px) saturate(140%)' } as ViewStyle) : {};

/** The warm page behind every screen. */
export function Ambient() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />
    </View>
  );
}

/** Fades and lifts its children into place, `delay` ms after mounting. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 450, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function Screen({
  children,
  scroll = true,
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: insets.top + space.lg,
    paddingBottom: insets.bottom + 130,
    paddingHorizontal: space.lg + 2,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  };
  return (
    <View style={styles.fill}>
      <Ambient />
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, contentStyle, { backgroundColor: 'transparent' }]}>{children}</View>
      )}
    </View>
  );
}

type TxtProps = TextProps & { style?: StyleProp<TextStyle>; children: ReactNode };

export const Display = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.display, style]} />;
export const Title = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.title, style]} />;
export const Body = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.body, style]} />;
export const Dim = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.body, styles.dim, style]} />;
export const Eyebrow = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.eyebrow, style]} />;

/** A white card on the warm page. `glow` outlines it in the accent for the moments that matter. */
export function Card({
  children,
  style,
  glow,
  onPress,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  glow?: boolean;
  onPress?: () => void;
}) {
  const press = useRef(new Animated.Value(0)).current;
  const panel = <View style={[styles.card, glow && styles.cardGlow, style]}>{children}</View>;
  if (!onPress) return panel;
  const to = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      onPressIn={() => to(1)}
      onPressOut={() => to(0)}
    >
      <Animated.View style={{ transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98] }) }] }}>
        {panel}
      </Animated.View>
    </Pressable>
  );
}

/** A soft highlight that sweeps across the main button now and then. */
function Sheen() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(x, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [-260, 420] }) }, { skewX: '-20deg' }] },
      ]}
    >
      <LinearGradient colors={gradients.sheen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: 90, height: '100%' }} />
    </Animated.View>
  );
}

/** The main action: a solid pill, in ink or (for alarms and Go time) the accent. */
export function InkButton({
  label,
  onPress,
  icon,
  style,
  disabled,
  tone = 'ink',
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  tone?: 'ink' | 'accent';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        tap('medium');
        onPress();
      }}
      style={({ pressed }) => [styles.goldWrap, { opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, style]}
    >
      <LinearGradient
        colors={tone === 'accent' ? [colors.accent, colors.accentStrong] : gradients.ink}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.goldBtn}
      >
        <Sheen />
        {icon}
        <Text style={[styles.goldBtnText, tone === 'accent' && { color: colors.onAccent }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  icon,
  tone = 'ink',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'ink' | 'danger' | 'plain';
  style?: StyleProp<ViewStyle>;
}) {
  const c = tone === 'danger' ? colors.danger : tone === 'plain' ? colors.textDim : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.ghostBtn,
        { borderColor: tone === 'plain' ? colors.hairline : tone === 'danger' ? c + '55' : colors.hairlineStrong, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
    >
      {icon}
      <Text style={[styles.ghostBtnText, { color: c }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color = colors.ink,
  left,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  left?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, active ? { backgroundColor: color === colors.ink ? colors.ink : color + '22', borderColor: color } : null]}
    >
      {left}
      <Text style={[styles.chipText, active && { color: color === colors.ink ? colors.onPaper : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={styles.segmentItem}
          >
            <View style={[styles.segmentActive, active && styles.segmentOn]}>
              <Text style={[styles.segmentText, active && { color: colors.text }]}>{o.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ flex: 1 }} />
        {right}
      </View>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <Fleuron style={[{ marginVertical: space.xl }, style]} />;
}

interface ConfirmRequest {
  title: string;
  message: string;
  actionLabel: string;
  onConfirm: () => void;
}

let showConfirm: ((r: ConfirmRequest | null) => void) | null = null;

/**
 * Ask before a destructive action, in Akol's own dialog. Browser dialogs are blocked
 * in some web embeds, and this looks the same on every platform.
 */
export function confirm(title: string, message: string, actionLabel: string, onConfirm: () => void) {
  if (showConfirm) showConfirm({ title, message, actionLabel, onConfirm });
  else onConfirm();
}

/** Render once near the root. */
export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  useEffect(() => {
    showConfirm = setReq;
    return () => {
      showConfirm = null;
    };
  }, []);
  const close = () => setReq(null);
  return (
    <Modal visible={!!req} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={[styles.scrim, glassBlur]} onPress={close}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <View style={styles.dialogBody}>
            <Text style={styles.dialogTitle}>{req?.title}</Text>
            <Dim style={{ textAlign: 'center' }}>{req?.message}</Dim>
            <View style={styles.dialogActions}>
              <GhostButton label="Cancel" tone="plain" onPress={close} style={{ flex: 1 }} />
              <InkButton
                label={req?.actionLabel ?? 'OK'}
                onPress={() => {
                  const r = req;
                  close();
                  r?.onConfirm();
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.ink}
        {...props}
        style={[styles.field, style]}
      />
    </View>
  );
}

export function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Body style={{ fontFamily: fonts.medium }}>{label}</Body>
        {hint && <Dim style={{ fontSize: 13, lineHeight: 18 }}>{hint}</Dim>}
      </View>
      <InkSwitch value={value} onValueChange={onChange} />
    </View>
  );
}

export function InkSwitch({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={(v) => {
        tap();
        onValueChange(v);
      }}
      trackColor={{ false: colors.hairlineStrong, true: colors.success }}
      thumbColor="#FFFFFF"
      // react-native-web ignores thumbColor for the "on" state.
      {...({ activeThumbColor: '#FFFFFF' } as object)}
      ios_backgroundColor={colors.hairlineStrong}
    />
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  display: { fontFamily: fonts.display, fontSize: 36, lineHeight: 42, color: colors.text, letterSpacing: -0.5 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.text, letterSpacing: -0.2 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  dim: { color: colors.textDim },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: colors.textDim,
  },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    padding: space.lg,
    ...shadow,
  },
  cardGlow: { borderWidth: 2, borderColor: colors.accentStrong },
  goldWrap: { borderRadius: radius.pill, ...shadow },
  goldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 16,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  goldBtnText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.onPaper },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: colors.card,
  },
  ghostBtnText: { fontFamily: fonts.semibold, fontSize: 15 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    backgroundColor: colors.card,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textDim },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bgRaised,
  },
  segmentItem: { flex: 1 },
  segmentActive: { borderRadius: radius.pill, paddingVertical: 10, alignItems: 'center' },
  segmentOn: { backgroundColor: colors.card, ...shadow },
  segmentText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textDim },
  sectionWrap: { marginTop: space.xxl, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadow,
  },
  dialogBody: { padding: space.xl, alignItems: 'center', gap: space.md },
  dialogTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.text, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, alignSelf: 'stretch' },
  field: {
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});

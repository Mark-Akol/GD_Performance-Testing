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

import { colors, fonts, gradients, radius, space } from '../theme';
import { Dingbat, Fleuron } from './Rules';

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

/** A soft radial glow built from stacked circles (no blur filter needed on native). */
function Glow({ size, color, style }: { size: number; color: string; style?: StyleProp<ViewStyle> }) {
  const rings = 16;
  return (
    <View style={[{ position: 'absolute', width: size, height: size }, style]} pointerEvents="none">
      {Array.from({ length: rings }).map((_, i) => {
        const s = size * (1 - i / rings);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: (size - s) / 2,
              top: (size - s) / 2,
              width: s,
              height: s,
              borderRadius: s / 2,
              backgroundColor: color,
              opacity: 0.014,
            }}
          />
        );
      })}
    </View>
  );
}

/** Slowly drifting gold and lilac light behind every page, for depth. */
export function Ambient() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [drift]);
  const a = drift.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const b = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ position: 'absolute', right: -160, top: -140, transform: [{ translateY: a }] }}>
        <Glow size={520} color={colors.ink} />
      </Animated.View>
      <Animated.View style={{ position: 'absolute', left: -220, top: 380, transform: [{ translateX: b }] }}>
        <Glow size={560} color={colors.lilac} />
      </Animated.View>
    </View>
  );
}

/** Fades and lifts its children into place, `delay` ms after mounting. */
export function FadeIn({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 700, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v,
          transform: [
            { perspective: 800 },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '0deg'] }) },
          ],
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

/** A dark glass panel with a lit top edge. Pressable panels tilt back in 3D when touched. */
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
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  const rest: ViewStyle = {};
  for (const [k, v] of Object.entries(flat)) (k.startsWith('margin') ? outer : rest)[k as keyof ViewStyle] = v as never;

  const panel = (
    <View style={[styles.cardFrame, glow && styles.cardGlow, outer]}>
      <LinearGradient colors={gradients.card} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(255,236,200,0)', glow ? 'rgba(255,226,170,0.7)' : 'rgba(255,236,200,0.35)', 'rgba(255,236,200,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardEdge}
      />
      <View style={[styles.card, rest]}>{children}</View>
    </View>
  );
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
      <Animated.View
        style={{
          transform: [
            { perspective: 900 },
            { rotateX: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] }) },
            { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
          ],
        }}
      >
        {panel}
      </Animated.View>
    </Pressable>
  );
}

/** A moving highlight that sweeps across gold surfaces. */
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

/** The main action: a polished gold pill. */
export function InkButton({
  label,
  onPress,
  icon,
  style,
  disabled,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
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
      <LinearGradient colors={gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goldBtn}>
        <Sheen />
        {icon}
        <Text style={styles.goldBtnText}>{label}</Text>
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
        glassBlur,
        { borderColor: tone === 'plain' ? colors.hairline : c + '66', transform: [{ scale: pressed ? 0.97 : 1 }] },
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
      style={[styles.chip, active ? { backgroundColor: color + '22', borderColor: color } : null]}
    >
      {left}
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
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
    <View style={[styles.segment, glassBlur]}>
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
            {active ? (
              <LinearGradient colors={gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentActive}>
                <Text style={[styles.segmentText, { color: '#1A1206' }]}>{o.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.segmentActive}>
                <Text style={styles.segmentText}>{o.label}</Text>
              </View>
            )}
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
        <Dingbat />
        <Eyebrow>{title}</Eyebrow>
        <LinearGradient
          colors={['rgba(232,199,138,0.45)', 'rgba(232,199,138,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.sectionLine}
        />
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
          <LinearGradient colors={['#1B1726', '#0E0C14']} style={StyleSheet.absoluteFill} />
          <View style={styles.dialogBody}>
            <Fleuron style={{ width: 120 }} />
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
      <Eyebrow style={{ fontSize: 10, color: colors.textDim }}>{label}</Eyebrow>
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.ink}
        {...props}
        style={[styles.field, glassBlur, style]}
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
      trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.inkDeep }}
      thumbColor={value ? '#FFE9BD' : '#8E8898'}
      // react-native-web ignores thumbColor for the "on" state.
      {...({ activeThumbColor: '#FFE9BD' } as object)}
      ios_backgroundColor="rgba(255,255,255,0.12)"
    />
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  display: { fontFamily: fonts.display, fontSize: 42, lineHeight: 46, color: colors.text, letterSpacing: -0.5 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  dim: { color: colors.textDim },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  cardFrame: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
    backgroundColor: 'rgba(16,14,22,0.55)',
    ...glassBlur,
  },
  cardGlow: {
    borderColor: colors.hairlineStrong,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
  },
  cardEdge: { position: 'absolute', top: 0, left: 24, right: 24, height: 1 },
  card: { padding: space.lg },
  goldWrap: {
    borderRadius: radius.pill,
    shadowColor: colors.ink,
    shadowOpacity: 0.45,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
  },
  goldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 17,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  goldBtnText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', color: '#1A1206' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255,250,240,0.04)',
  },
  ghostBtnText: { fontFamily: fonts.semibold, fontSize: 12.5, letterSpacing: 1.8, textTransform: 'uppercase' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,250,240,0.04)',
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textDim },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,250,240,0.04)',
  },
  segmentItem: { flex: 1 },
  segmentActive: { borderRadius: radius.pill, paddingVertical: 11, alignItems: 'center' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.textDim },
  sectionWrap: { marginTop: space.xxl, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionLine: { flex: 1, height: 1 },
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    overflow: 'hidden',
  },
  dialogBody: { padding: space.xl, alignItems: 'center', gap: space.md },
  dialogTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.text, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, alignSelf: 'stretch' },
  field: {
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,250,240,0.04)',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});

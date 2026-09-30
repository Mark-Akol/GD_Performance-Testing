import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
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

import { colors, fonts, radius, space } from '../theme';
import { Dingbat, Fleuron } from './Rules';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else
    Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
}

/** A plain white page with generous margins. */
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
    paddingBottom: insets.bottom + 110,
    paddingHorizontal: space.lg + 2,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  };
  return (
    <View style={styles.fill}>
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, contentStyle]}>{children}</View>
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

/** A panel with a hairline border. `glow` gives it a double frame, like a watch bezel. */
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
  // A bulletin box's margins belong on its outer (heavy) border; everything else styles the inner box.
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  const rest: ViewStyle = {};
  for (const [k, v] of Object.entries(flat)) (k.startsWith('margin') ? outer : rest)[k as keyof ViewStyle] = v as never;
  const inner = glow ? (
    <View style={[styles.bulletinOuter, outer]}>
      <View style={[styles.card, styles.bulletinInner, rest]}>{children}</View>
    </View>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {inner}
    </Pressable>
  );
}

/** Reversed type: paper letters on a solid ink block. */
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
      style={({ pressed }) => [styles.inkBtn, { opacity: disabled ? 0.35 : pressed ? 0.8 : 1 }, style]}
    >
      {icon}
      <Text style={styles.inkBtnText}>{label}</Text>
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
  const c = tone === 'plain' ? colors.textDim : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.ghostBtn,
        { borderColor: tone === 'plain' ? colors.hairline : colors.ink, opacity: pressed ? 0.6 : 1 },
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
  left,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Ignored in the monochrome theme; kept so callers don't change. */
  color?: string;
  left?: ReactNode;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, active ? styles.chipActive : null]}
    >
      {left}
      <Text style={[styles.chipText, active && { color: colors.bg }]}>{label}</Text>
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
      {options.map((o, i) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segmentItem, i > 0 && styles.segmentDivider, active && { borderBottomColor: colors.ink }]}
          >
            <Text style={[styles.segmentText, active && { color: colors.ink }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A section head: a dot, a tracked label, and a hairline running out to the right. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <Dingbat />
        <Eyebrow>{title}</Eyebrow>
        <View style={styles.sectionLine} />
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
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={styles.dialog} onPress={() => {}}>
          <View style={styles.dialogBody}>
            <Fleuron style={{ width: 120 }} />
            <Text style={styles.dialogTitle}>{req?.title}</Text>
            <Text style={[styles.body, { textAlign: 'center', fontFamily: fonts.light }]}>{req?.message}</Text>
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

/** A label above an input that sits on a single hairline. */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow style={{ color: colors.textDim, fontSize: 10 }}>{label}</Eyebrow>
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
        {hint && <Dim style={{ fontSize: 13, lineHeight: 18, fontFamily: fonts.light }}>{hint}</Dim>}
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
      trackColor={{ false: 'rgba(20,20,20,0.15)', true: colors.ink }}
      thumbColor={colors.bg}
      // react-native-web ignores thumbColor for the "on" state.
      {...({ activeThumbColor: colors.bg } as object)}
      ios_backgroundColor="rgba(20,20,20,0.15)"
    />
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  display: { fontFamily: fonts.display, fontSize: 40, lineHeight: 46, color: colors.text, letterSpacing: -0.5, ...{ fontVariant: ['lining-nums'] } },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.text },
  dim: { color: colors.textDim },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 10.5,
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.hairline,
    padding: space.lg,
    backgroundColor: colors.card,
  },
  bulletinOuter: { borderWidth: 1, borderColor: colors.ink, padding: 4, backgroundColor: colors.card },
  bulletinInner: { borderWidth: 1, borderColor: colors.ink },
  inkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 17,
    paddingHorizontal: space.xl,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
  },
  inkBtnText: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    color: colors.bg,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 15,
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderRadius: radius.pill,
  },
  ghostBtnText: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 2.4, textTransform: 'uppercase' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radius.pill,
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.medium, fontSize: 13, letterSpacing: 0.4, color: colors.ink },
  segment: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.hairline },
  segmentItem: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  segmentDivider: {},
  segmentText: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    color: colors.textFaint,
    letterSpacing: 2.6,
    textTransform: 'uppercase',
  },
  sectionWrap: { marginTop: space.xxl, marginBottom: space.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionLine: { flex: 1, height: 1, backgroundColor: colors.ink },
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: { width: '100%', maxWidth: 380, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.ink, padding: 4 },
  dialogBody: { padding: space.xl, alignItems: 'center', gap: space.md, borderWidth: 1, borderColor: colors.ink },
  dialogTitle: { fontFamily: fonts.italic, fontSize: 28, color: colors.text, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, alignSelf: 'stretch' },
  field: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingHorizontal: 0,
    paddingVertical: 10,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});

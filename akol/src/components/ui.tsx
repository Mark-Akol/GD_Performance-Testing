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

import { colors, fonts, SLANT, space, stroke } from '../theme';
import { Burst } from './Manga';
import { Fleuron } from './Rules';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else
    Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
}

/** A white page. */
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
    paddingBottom: insets.bottom + 120,
    paddingHorizontal: space.lg,
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

/** A manga panel. `glow` adds the hard offset shadow of a feature panel. */
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
  // Margins belong to the outer frame (so the shadow moves with the panel); everything else styles the panel.
  const flat = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = {};
  const rest: ViewStyle = {};
  for (const [k, v] of Object.entries(flat)) (k.startsWith('margin') ? outer : rest)[k as keyof ViewStyle] = v as never;
  const inner = (
    <View style={[glow ? styles.shadowPad : null, outer]}>
      {glow && <View style={styles.shadow} />}
      <View style={[styles.card, glow && styles.cardGlow, rest]}>{children}</View>
    </View>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1, transform: [{ translateX: pressed ? 2 : 0 }, { translateY: pressed ? 2 : 0 }] })}
    >
      {inner}
    </Pressable>
  );
}

/** The main action: a slanted black slab with title-card lettering. */
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
      style={({ pressed }) => [styles.btnWrap, { opacity: disabled ? 0.35 : 1 }, style]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.btnShadow, { backgroundColor: colors.bg, borderWidth: stroke.line, borderColor: colors.ink }]} />
          <View style={[styles.inkBtn, pressed && styles.btnPressed]}>
            {icon}
            <Text style={styles.inkBtnText}>{label}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

/** Secondary action: a slanted white slab with a hard black shadow. */
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
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.btnWrap, style]}
    >
      {({ pressed }) => (
        <>
          {tone !== 'plain' && <View style={styles.btnShadow} />}
          <View style={[styles.ghostBtn, tone === 'plain' && { borderWidth: stroke.line }, pressed && styles.btnPressed]}>
            {icon}
            <Text style={[styles.ghostBtnText, tone === 'plain' && { color: colors.textDim }]}>
              {tone === 'danger' ? `${label} !` : label}
            </Text>
          </View>
        </>
      )}
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
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segmentItem, active && { backgroundColor: colors.ink }]}
          >
            <Text style={[styles.segmentText, active && { color: colors.bg }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A section head: a slanted black caption tab and a heavy rule running out to the right. */
export function SectionHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTab}>
          <Text style={styles.sectionTabText}>{title}</Text>
        </View>
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
        <Pressable style={styles.dialogWrap} onPress={() => {}}>
          <View style={styles.shadow} />
          <View style={styles.dialog}>
            <Burst size={64} style={styles.dialogBurst}>
              <Text style={styles.dialogBurstText}>!?</Text>
            </Burst>
            <Text style={styles.dialogTitle}>{req?.title}</Text>
            <Text style={[styles.body, { textAlign: 'center' }]}>{req?.message}</Text>
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

/** A label above an input that sits on a heavy ink line. */
export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Eyebrow style={{ fontSize: 10 }}>{label}</Eyebrow>
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
        <Body style={{ fontFamily: fonts.semibold }}>{label}</Body>
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
      trackColor={{ false: 'rgba(0,0,0,0.15)', true: colors.ink }}
      thumbColor={colors.bg}
      // react-native-web ignores thumbColor for the "on" state.
      {...({ activeThumbColor: colors.bg } as object)}
      ios_backgroundColor="rgba(0,0,0,0.15)"
    />
  );
}

export const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 42, color: colors.text },
  title: { fontFamily: fonts.display, fontSize: 20, lineHeight: 26, color: colors.text },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  dim: { color: colors.textDim },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: colors.ink,
  },
  card: {
    borderWidth: stroke.line,
    borderColor: colors.ink,
    padding: space.lg,
    backgroundColor: colors.card,
  },
  cardGlow: { borderWidth: stroke.panel },
  shadowPad: { paddingRight: 5, paddingBottom: 5 },
  shadow: { position: 'absolute', left: 5, top: 5, right: 0, bottom: 0, backgroundColor: colors.ink },
  btnWrap: { paddingRight: 4, paddingBottom: 4 },
  btnShadow: {
    position: 'absolute',
    left: 4,
    top: 4,
    right: 0,
    bottom: 0,
    backgroundColor: colors.ink,
    transform: [{ skewX: SLANT }],
  },
  btnPressed: { transform: [{ skewX: SLANT }, { translateX: 3 }, { translateY: 3 }] },
  inkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 16,
    paddingHorizontal: space.xl,
    backgroundColor: colors.ink,
    transform: [{ skewX: SLANT }],
  },
  inkBtnText: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 1, color: colors.bg, textTransform: 'uppercase' },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 14,
    paddingHorizontal: space.lg,
    borderWidth: stroke.panel,
    borderColor: colors.ink,
    backgroundColor: colors.bg,
    transform: [{ skewX: SLANT }],
  },
  ghostBtnText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, textTransform: 'uppercase', color: colors.ink },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderWidth: stroke.line,
    borderColor: colors.ink,
    backgroundColor: colors.bg,
    transform: [{ skewX: SLANT }],
  },
  chipActive: { backgroundColor: colors.ink },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.6, color: colors.ink, textTransform: 'uppercase' },
  segment: { flexDirection: 'row', gap: space.sm },
  segmentItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderWidth: stroke.panel,
    borderColor: colors.ink,
    transform: [{ skewX: SLANT }],
  },
  segmentText: { fontFamily: fonts.display, fontSize: 13, color: colors.ink, letterSpacing: 1, textTransform: 'uppercase' },
  sectionWrap: { marginTop: space.xxl, marginBottom: space.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionTab: { backgroundColor: colors.ink, paddingHorizontal: 12, paddingVertical: 5, transform: [{ skewX: SLANT }] },
  sectionTabText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: colors.bg, textTransform: 'uppercase' },
  sectionLine: { flex: 1, height: stroke.panel, backgroundColor: colors.ink },
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialogWrap: { width: '100%', maxWidth: 380, paddingRight: 5, paddingBottom: 5 },
  dialog: {
    backgroundColor: colors.bg,
    borderWidth: stroke.heavy,
    borderColor: colors.ink,
    padding: space.xl,
    paddingTop: space.xxl,
    alignItems: 'center',
    gap: space.md,
  },
  dialogBurst: { position: 'absolute', top: -30, right: -18 },
  dialogBurstText: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  dialogTitle: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.text, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, alignSelf: 'stretch' },
  field: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.text,
    borderBottomWidth: stroke.panel,
    borderBottomColor: colors.ink,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
});

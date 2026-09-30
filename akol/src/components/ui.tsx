import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
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

import { colors, fonts, gradients, radius, space } from '../theme';
import { KenteBand, Lozenge } from './Kente';

export function tap(kind: 'light' | 'medium' | 'success' = 'light') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else
    Haptics.impactAsync(
      kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    ).catch(() => {});
}

/** Full-bleed ebony backdrop: a kente band at the top edge and a sunset glow beneath it. */
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
    paddingTop: insets.top + space.xl,
    paddingBottom: insets.bottom + 110,
    paddingHorizontal: space.lg,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  };
  return (
    <View style={styles.fill}>
      <LinearGradient colors={gradients.page} style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={gradients.glow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.glow}
        pointerEvents="none"
      />
      {scroll ? (
        <ScrollView contentContainerStyle={[pad, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, pad, contentStyle]}>{children}</View>
      )}
      <KenteBand height={6} repeats={10} style={[styles.topBand, { top: 0, height: insets.top + 6, justifyContent: 'flex-end' }]} />
    </View>
  );
}

type TxtProps = TextProps & { style?: StyleProp<TextStyle>; children: ReactNode };

export const Display = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.display, style]} />;
export const Title = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.title, style]} />;
export const Body = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.body, style]} />;
export const Dim = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.body, styles.dim, style]} />;
export const Eyebrow = ({ style, ...p }: TxtProps) => <Text {...p} style={[styles.eyebrow, style]} />;

/** Lacquered card with a gilt hairline. */
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
  const inner = (
    <LinearGradient
      colors={gradients.card}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, glow && styles.cardGlow, style]}
    >
      {children}
    </LinearGradient>
  );
  if (!onPress) return inner;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      {inner}
    </Pressable>
  );
}

export function GoldButton({
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
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}
    >
      <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.goldBtn}>
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
  tone = 'gold',
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  tone?: 'gold' | 'danger' | 'plain';
  style?: StyleProp<ViewStyle>;
}) {
  const c = tone === 'danger' ? colors.danger : tone === 'plain' ? colors.textDim : colors.gold;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.ghostBtn, { borderColor: c + '66', opacity: pressed ? 0.7 : 1 }, style]}
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
  color = colors.gold,
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
      style={[
        styles.chip,
        active ? { backgroundColor: color + '26', borderColor: color } : { borderColor: colors.hairline },
      ]}
    >
      {left}
      <Text style={[styles.chipText, { color: active ? color : colors.textDim }]}>{label}</Text>
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
            {active ? (
              <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.segmentActive}>
                <Text style={[styles.segmentText, { color: colors.bg }]}>{o.label}</Text>
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
    <View style={styles.sectionHeader}>
      <View style={styles.row}>
        <Lozenge size={7} />
        <Eyebrow>{title}</Eyebrow>
      </View>
      {right}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <LinearGradient
      colors={['rgba(242,182,50,0)', 'rgba(242,182,50,0.4)', 'rgba(242,182,50,0)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[{ height: StyleSheet.hairlineWidth * 2, marginVertical: space.lg }, style]}
    />
  );
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
          <KenteBand height={6} repeats={4} />
          <View style={styles.dialogBody}>
            <Lozenge size={10} />
            <Text style={styles.dialogTitle}>{req?.title}</Text>
            <Dim style={{ textAlign: 'center' }}>{req?.message}</Dim>
            <View style={styles.dialogActions}>
              <GhostButton label="Cancel" tone="plain" onPress={close} style={{ flex: 1 }} />
              <GhostButton
                label={req?.actionLabel ?? 'OK'}
                tone="danger"
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
      <Eyebrow style={{ color: colors.textDim, fontSize: 10 }}>{label}</Eyebrow>
      <TextInput
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.gold}
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
      <Switch
        value={value}
        onValueChange={(v) => {
          tap();
          onChange(v);
        }}
        trackColor={{ false: 'rgba(255,255,255,0.12)', true: colors.goldDeep }}
        thumbColor={value ? colors.goldPale : '#8D8A80'}
        // react-native-web ignores thumbColor for the "on" state.
        {...({ activeThumbColor: colors.goldPale } as object)}
        ios_backgroundColor="rgba(255,255,255,0.12)"
      />
    </View>
  );
}

export const styles = StyleSheet.create({
  field: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ivory,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  fill: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  topBand: { position: 'absolute', left: 0, right: 0, backgroundColor: colors.bg },
  scrim: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  dialog: {
    width: '100%',
    maxWidth: 380,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.bgRaised,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
  },
  dialogBody: { padding: space.xl, alignItems: 'center', gap: space.md },
  dialogTitle: { fontFamily: fonts.display, fontSize: 22, color: colors.ivory, textAlign: 'center' },
  dialogActions: { flexDirection: 'row', gap: space.md, marginTop: space.sm, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  display: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.ivory, letterSpacing: 0.2, fontVariant: ['lining-nums'] },
  title: { fontFamily: fonts.displayMedium, fontSize: 21, lineHeight: 27, color: colors.ivory },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.text },
  dim: { color: colors.textDim },
  eyebrow: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.hairline,
    padding: space.lg,
    overflow: 'hidden',
  },
  cardGlow: {
    borderColor: colors.hairlineStrong,
    shadowColor: colors.gold,
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  goldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 15,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
  },
  goldBtnText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.bg, letterSpacing: 0.4 },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  ghostBtnText: { fontFamily: fonts.medium, fontSize: 14, letterSpacing: 0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  segmentItem: { flex: 1 },
  segmentActive: { borderRadius: radius.pill, paddingVertical: 10, alignItems: 'center' },
  segmentText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textDim, letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.md,
  },
});

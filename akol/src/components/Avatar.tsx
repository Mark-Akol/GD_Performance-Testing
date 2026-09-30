import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { FAMILY_ID } from '../lib/schedule';
import type { Member } from '../lib/types';
import { colors, familyJewel, fonts, jewels, type SealStyle } from '../theme';
import { Tone } from './Manga';

export function jewelFor(member: Member | undefined | null, memberId?: string) {
  if (!member) return memberId === FAMILY_ID ? familyJewel : jewels.adire;
  return jewels[member.color] ?? jewels.adire;
}

export function ProgressRing({
  size,
  stroke = 3,
  ratio,
  color = colors.ink,
  track = 'rgba(0,0,0,0.12)',
}: {
  size: number;
  stroke?: number;
  ratio: number;
  color?: string;
  track?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {clamped > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - clamped)}
        />
      )}
    </Svg>
  );
}

function sealStyle(style: SealStyle, d: number): { box: ViewStyle; ink: string } {
  const round = { width: d, height: d, borderRadius: d / 2, overflow: 'hidden' as const };
  switch (style) {
    case 'solid':
      return { box: { ...round, backgroundColor: colors.ink }, ink: colors.bg };
    case 'wash':
    case 'dotted':
      return { box: { ...round, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.bg }, ink: colors.ink };
    case 'outline':
      return { box: { ...round, borderWidth: 2, borderColor: colors.ink }, ink: colors.ink };
    case 'heavy':
      return { box: { ...round, borderWidth: Math.max(4, d * 0.12), borderColor: colors.ink }, ink: colors.ink };
    case 'double':
      return { box: { ...round, borderWidth: 2, borderColor: colors.ink, padding: 2 }, ink: colors.ink };
  }
}

/** A character badge: the member's initial in title lettering, inked in their style. With `ratio`, ringed by progress. */
export function Avatar({
  member,
  memberId,
  size = 44,
  ratio,
}: {
  member?: Member | null;
  memberId?: string;
  size?: number;
  ratio?: number;
}) {
  const j = jewelFor(member, memberId);
  const ringGap = ratio === undefined ? 0 : Math.max(4, size * 0.1);
  const inner = size - ringGap * 2;
  const { box, ink } = sealStyle(j.style, inner);
  const label = member?.emoji || (member ? member.name.slice(0, 1).toUpperCase() : '✠');
  const face = (
    <Text style={{ fontSize: inner * 0.46, fontFamily: fonts.display, color: ink, textAlign: 'center', includeFontPadding: false }}>
      {label}
    </Text>
  );
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ratio !== undefined && (
        <View style={StyleSheet.absoluteFill}>
          <ProgressRing size={size} ratio={ratio} stroke={Math.max(2, size * 0.045)} />
        </View>
      )}
      <View style={[box, styles.center]}>
        {j.tone > 0 && <Tone density={j.tone} pitch={Math.max(4, inner / 9)} />}
        {j.tone > 0 ? (
          <View style={[styles.center, { backgroundColor: colors.bg, width: inner * 0.56, height: inner * 0.56, borderRadius: inner }]}>{face}</View>
        ) : j.style === 'double' ? (
          <View style={[styles.center, styles.innerRing, { borderRadius: inner }]}>{face}</View>
        ) : (
          face
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  innerRing: { flex: 1, alignSelf: 'stretch', borderWidth: 1, borderColor: colors.ink },
});

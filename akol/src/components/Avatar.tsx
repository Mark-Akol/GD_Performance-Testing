import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { FAMILY_ID } from '../lib/schedule';
import type { Member } from '../lib/types';
import { colors, familyJewel, fonts, jewels } from '../theme';

export function jewelFor(member: Member | undefined | null, memberId?: string) {
  if (!member) return memberId === FAMILY_ID ? familyJewel : jewels.pearl;
  return jewels[member.color] ?? jewels.pearl;
}

export function ProgressRing({
  size,
  stroke = 3,
  ratio,
  color = colors.gold,
  track = 'rgba(255,255,255,0.08)',
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
  // Unique per ring so gradients don't collide on web, where SVG ids share one document.
  const gradId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Defs>
        <SvgGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.9} />
          <Stop offset="0.35" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0.85} />
        </SvgGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      {clamped > 0 && (
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - clamped)}
        />
      )}
    </Svg>
  );
}

/** Jewel-toned medallion. With `ratio`, it is ringed by a progress arc. */
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
  const ringGap = ratio === undefined ? 0 : Math.max(4, size * 0.09);
  const inner = size - ringGap * 2;
  const label = member?.emoji || (member ? member.name.slice(0, 1).toUpperCase() : '✦');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ratio !== undefined && (
        <View style={StyleSheet.absoluteFill}>
          <ProgressRing size={size} ratio={ratio} color={j.base} stroke={Math.max(2.5, size * 0.055)} />
        </View>
      )}
      <LinearGradient
        colors={[j.light, j.base, j.deep]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.35)',
        }}
      >
        <Text
          style={{
            fontSize: inner * 0.46,
            fontFamily: member?.emoji ? undefined : fonts.display,
            color: colors.bg,
          }}
        >
          {label}
        </Text>
      </LinearGradient>
    </View>
  );
}

import { LinearGradient } from 'expo-linear-gradient';
import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

import { FAMILY_ID } from '../lib/schedule';
import type { Member } from '../lib/types';
import { colors, familyJewel, fonts, jewels } from '../theme';

export function jewelFor(member: Member | undefined | null, memberId?: string) {
  if (!member) return memberId === FAMILY_ID ? familyJewel : jewels.sika;
  return jewels[member.color] ?? jewels.sika;
}

export function ProgressRing({
  size,
  stroke = 3,
  ratio,
  color = colors.ink,
  track = 'rgba(255,236,200,0.12)',
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
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
          <Stop offset="0.4" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0.8} />
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

/** A polished gem badge in the member's metal or stone. With `ratio`, ringed by progress. */
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
  const label = member?.emoji || (member ? member.name.slice(0, 1).toUpperCase() : '✦');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {ratio !== undefined && (
        <View style={StyleSheet.absoluteFill}>
          <ProgressRing size={size} ratio={ratio} color={j.base} stroke={Math.max(2, size * 0.05)} />
        </View>
      )}
      <View
        style={{
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          shadowColor: j.base,
          shadowOpacity: 0.55,
          shadowRadius: inner * 0.35,
          shadowOffset: { width: 0, height: inner * 0.08 },
        }}
      >
        <LinearGradient
          colors={[j.light, j.base, j.deep]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.gem, { borderRadius: inner / 2 }]}
        >
          {/* specular highlight */}
          <View
            style={{
              position: 'absolute',
              top: inner * 0.1,
              left: inner * 0.18,
              width: inner * 0.42,
              height: inner * 0.22,
              borderRadius: inner,
              backgroundColor: 'rgba(255,255,255,0.45)',
              transform: [{ rotate: '-25deg' }],
            }}
          />
          <Text style={{ fontSize: inner * 0.5, fontFamily: fonts.displayBold, color: '#1A1206' }}>{label}</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
});

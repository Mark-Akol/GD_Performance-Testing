import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { colors, fonts } from '../theme';

export interface VinylTrack {
  id: string;
  done: boolean;
  due?: boolean;
}

function polar(c: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: c + r * Math.cos(a), y: c + r * Math.sin(a) };
}

/** A fixed highlight wedge, the shine that sits still while a record turns. */
function sheen(c: number, r0: number, r1: number, a0: number, a1: number) {
  const o0 = polar(c, r1, a0);
  const o1 = polar(c, r1, a1);
  const i1 = polar(c, r0, a1);
  const i0 = polar(c, r0, a0);
  return `M ${o0.x} ${o0.y} A ${r1} ${r1} 0 0 1 ${o1.x} ${o1.y} L ${i1.x} ${i1.y} A ${r0} ${r0} 0 0 0 ${i0.x} ${i0.y} Z`;
}

/**
 * The day as a record. Each task is a track cut into the vinyl, outermost first, as on a
 * real LP. Played tracks shine, the one due now is lit, the tonearm sits on now, and the
 * label carries the routine's name. The record turns at a lazy, steady speed.
 */
export function Vinyl({
  tracks,
  title,
  side = 'A',
  nowFrac,
  size = 320,
  spinning = true,
}: {
  tracks: VinylTrack[];
  title: string;
  side?: string;
  /** Where now falls in the routine, 0 (first track) to 1 (last). */
  nowFrac?: number;
  size?: number;
  spinning?: boolean;
}) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!spinning) return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin, spinning]);
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const S = size;
  const c = S / 2;
  const outer = S / 2 - 2;
  const labelR = S * 0.17;
  const playOuter = outer - S * 0.03;
  const playInner = labelR + S * 0.05;
  const n = Math.max(1, tracks.length);
  const gap = 2.4;
  const band = (playOuter - playInner - gap * (n - 1)) / n;

  // Fine grooves across the whole playing surface.
  const grooves: number[] = [];
  for (let r = playInner; r <= playOuter; r += 2.2) grooves.push(r);

  // Tonearm: pivot outside the record at top right; the needle tracks now, outer to inner.
  const pivot = { x: S + 6, y: S * 0.06 };
  const f = Math.max(0, Math.min(1, nowFrac ?? 0));
  const needleR = playOuter - f * (playOuter - playInner);
  const needle = polar(c, needleR, -28 + f * 22);

  return (
    <View style={{ width: S + 26, height: S, alignSelf: 'center' }}>
      <Animated.View style={{ width: S, height: S, transform: [{ rotate }] }}>
        <Svg width={S} height={S}>
          {/* the disc */}
          <Circle cx={c} cy={c} r={outer} fill="#070707" stroke="rgba(255,255,255,0.35)" strokeWidth={1} />
          {grooves.map((r) => (
            <Circle key={r} cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.055)" strokeWidth={0.7} />
          ))}
          {/* tracks, outermost first */}
          {tracks.map((t, i) => {
            const r1 = playOuter - i * (band + gap);
            const r = r1 - band / 2;
            const stroke = t.done ? 'rgba(255,255,255,0.55)' : t.due ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.12)';
            return (
              <G key={t.id}>
                <Circle cx={c} cy={c} r={r} fill="none" stroke={stroke} strokeWidth={Math.max(1, band - 1)} />
                <Circle cx={c} cy={c} r={r1 + gap / 2} fill="none" stroke="#000" strokeWidth={gap} />
              </G>
            );
          })}
          {/* label */}
          <Circle cx={c} cy={c} r={labelR} fill={colors.ink} />
          <Circle cx={c} cy={c} r={labelR - 3} fill="none" stroke="#000" strokeWidth={0.8} />
          <Rect x={c - labelR} y={c + labelR * 0.18} width={labelR * 2} height={1} fill="#000" />
          <Circle cx={c} cy={c} r={S * 0.012} fill="#000" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.label]} pointerEvents="none">
          <Text style={[styles.brand, { fontSize: labelR * 0.42 }]}>AKOL</Text>
          <Text style={[styles.side, { fontSize: labelR * 0.14 }]} numberOfLines={1}>
            SIDE {side} · {title.toUpperCase()}
          </Text>
          <Text style={[styles.rpm, { fontSize: labelR * 0.12 }]}>33⅓ RPM · {tracks.length} TRACKS</Text>
        </View>
      </Animated.View>

      {/* light that stays put while the record turns */}
      <View style={[StyleSheet.absoluteFill, { width: S }]} pointerEvents="none">
        <Svg width={S} height={S}>
          <Path d={sheen(c, labelR + 6, outer - 2, 200, 232)} fill="rgba(255,255,255,0.07)" />
          <Path d={sheen(c, labelR + 6, outer - 2, 20, 52)} fill="rgba(255,255,255,0.05)" />
        </Svg>
      </View>

      {/* tonearm */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={S + 26} height={S}>
          <Circle cx={pivot.x - 6} cy={pivot.y + 8} r={13} fill="#111" stroke={colors.ink} strokeWidth={1.5} />
          <Circle cx={pivot.x - 6} cy={pivot.y + 8} r={4} fill={colors.ink} />
          <Line x1={pivot.x - 6} y1={pivot.y + 8} x2={needle.x + 8} y2={needle.y - 10} stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
          <G transform={`translate(${needle.x}, ${needle.y}) rotate(-35)`}>
            <Rect x={-4} y={-14} width={14} height={20} fill={colors.ink} />
            <Rect x={1} y={6} width={3} height={5} fill={colors.ink} />
          </G>
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: fonts.display, color: '#000', letterSpacing: 1, marginTop: -6 },
  side: { fontFamily: fonts.semibold, color: '#000', letterSpacing: 1, maxWidth: '30%' },
  rpm: { fontFamily: fonts.medium, color: '#000', letterSpacing: 1, marginTop: 2 },
});

import { useId, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Pattern, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import { colors, fonts, SLANT, stroke } from '../theme';

/** SVG ids must be unique per document on web. */
function useSvgId(prefix: string) {
  return `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** A tiny deterministic random so drawings don't shimmer between renders. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Screentone: the dot pattern manga uses for grey. `density` 0..1 sets how dark it reads.
 * Fills its parent; put it first inside a relatively positioned View.
 */
export function Tone({
  density = 0.35,
  pitch = 6,
  inverted,
  style,
}: {
  density?: number;
  pitch?: number;
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const id = useSvgId('tone');
  const r = Math.max(0.4, (pitch / 2) * Math.sqrt(Math.min(1, density)) * 0.95);
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} patternUnits="userSpaceOnUse" width={pitch} height={pitch} patternTransform="rotate(45)">
            <Circle cx={pitch / 2} cy={pitch / 2} r={r} fill={inverted ? colors.bg : colors.ink} />
          </Pattern>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * Speed lines radiating from a focus point, the way a manga panel shows impact or urgency.
 * `focus` is relative (0..1) within the panel.
 */
export function SpeedLines({
  count = 64,
  focus = { x: 0.5, y: 0.5 },
  clear = 0.32,
  inverted,
  seed = 7,
  style,
}: {
  count?: number;
  focus?: { x: number; y: number };
  /** Radius of the calm centre, relative to the panel's larger side. */
  clear?: number;
  inverted?: boolean;
  seed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const W = 400;
  const H = 400;
  const fx = focus.x * W;
  const fy = focus.y * H;
  const far = 700;
  const r = rand(seed);
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.08;
    const w = 0.004 + r() * 0.018;
    const inner = clear * W * (0.85 + r() * 0.5);
    const tip = { x: fx + Math.cos(a) * inner, y: fy + Math.sin(a) * inner };
    const b1 = { x: fx + Math.cos(a - w) * far, y: fy + Math.sin(a - w) * far };
    const b2 = { x: fx + Math.cos(a + w) * far, y: fy + Math.sin(a + w) * far };
    lines.push(`${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`);
  }
  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice">
        <G>
          {lines.map((p, i) => (
            <Polygon key={i} points={p} fill={inverted ? colors.bg : colors.ink} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

/** A jagged impact burst with lettering inside ("LATE!!", "CLEAR!"). */
export function Burst({
  size = 72,
  spikes = 14,
  children,
  inverted,
  seed = 3,
  style,
}: {
  size?: number;
  spikes?: number;
  children?: ReactNode;
  inverted?: boolean;
  seed?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const r = rand(seed);
  const c = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? c * (0.9 + r() * 0.1) : c * (0.58 + r() * 0.12);
    pts.push(`${c + Math.cos(a) * rad},${c + Math.sin(a) * rad}`);
  }
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Polygon
            points={pts.join(' ')}
            fill={inverted ? colors.ink : colors.bg}
            stroke={inverted ? colors.bg : colors.ink}
            strokeWidth={stroke.line}
            strokeLinejoin="miter"
          />
        </Svg>
      </View>
      {children}
    </View>
  );
}

/**
 * A hand-lettered sound effect: outlined katakana set at an angle (ドン, ゴゴゴ, ダッ).
 * Decorative only; hidden from screen readers.
 */
export function SFX({
  text,
  size = 48,
  rotate = -12,
  solid,
  inverted,
  style,
}: {
  text: string;
  size?: number;
  rotate?: number;
  solid?: boolean;
  inverted?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ink = inverted ? colors.bg : colors.ink;
  const paper = inverted ? colors.ink : colors.bg;
  const w = size * text.length * 1.05 + size * 0.3;
  const h = size * 1.3;
  return (
    <View
      style={[{ width: w, height: h, transform: [{ rotate: `${rotate}deg` }] }, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={w} height={h}>
        <SvgText
          x={w / 2}
          y={size * 1.05}
          fontSize={size}
          fontFamily={fonts.display}
          textAnchor="middle"
          fill={solid ? ink : paper}
          stroke={ink}
          strokeWidth={solid ? 0 : Math.max(1.5, size / 18)}
          strokeLinejoin="round"
        >
          {text}
        </SvgText>
      </Svg>
    </View>
  );
}

/** The black, slanted caption box manga uses for narration ("NEXT MISSION"). */
export function CaptionTab({ children, inverted, style }: { children: ReactNode; inverted?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.tab, inverted && { backgroundColor: colors.bg }, style]}>
      <Text style={[styles.tabText, inverted && { color: colors.ink }]}>{children}</Text>
    </View>
  );
}

/**
 * A manga panel: heavy border, a hard offset shadow, and optional screentone or speed
 * lines behind the content. `tilt` rotates it a degree or two for energy.
 */
export function Panel({
  children,
  tone,
  lines,
  inverted,
  tilt = 0,
  shadow = true,
  style,
}: {
  children: ReactNode;
  tone?: number;
  lines?: { x: number; y: number; clear?: number; count?: number };
  inverted?: boolean;
  tilt?: number;
  shadow?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ transform: [{ rotate: `${tilt}deg` }] }, shadow && styles.shadowPad]}>
      {shadow && <View style={styles.shadow} />}
      <View style={[styles.panel, inverted && { backgroundColor: colors.ink }, style]}>
        {tone !== undefined && <Tone density={tone} inverted={inverted} />}
        {lines && (
          <SpeedLines focus={{ x: lines.x, y: lines.y }} clear={lines.clear} count={lines.count} inverted={inverted} />
        )}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    alignSelf: 'flex-start',
    backgroundColor: colors.ink,
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ skewX: SLANT }],
  },
  tabText: { fontFamily: fonts.display, fontSize: 11, letterSpacing: 1.5, color: colors.bg, textTransform: 'uppercase' },
  panel: {
    borderWidth: stroke.panel,
    borderColor: colors.ink,
    backgroundColor: colors.bg,
    overflow: 'hidden',
    padding: 16,
  },
  shadowPad: { paddingRight: 5, paddingBottom: 5 },
  shadow: { position: 'absolute', left: 5, top: 5, right: 0, bottom: 0, backgroundColor: colors.ink },
});

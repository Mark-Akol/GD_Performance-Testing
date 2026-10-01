import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

import { Canvas } from './Canvas3D';

export interface Bead {
  id: string;
  /** Position along the routine's window, 0..1. */
  frac: number;
  done: boolean;
  due?: boolean;
  late?: boolean;
}

export interface OrbitRing {
  id: string;
  hex: string;
  /** 1 for metals, lower for gems. */
  metal: number;
  beads: Bead[];
}

/** How much of each ring the routine's window spans; the gap reads as "before" and "after". */
const SWEEP = Math.PI * 2 * 0.86;
const START = Math.PI * 0.57;

const angleOf = (frac: number) => START - frac * SWEEP;

/** Studio lighting generated in code, so metals reflect without downloading an HDR file. */
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Core({ intensity = 1 }: { intensity?: number }) {
  const halo = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const s = 1 + Math.sin(clock.elapsedTime * 1.6) * 0.04;
    halo.current?.scale.setScalar(s);
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.38, 64, 64]} />
        <meshStandardMaterial color="#FFFFFF" emissive="#FFFFFF" emissiveIntensity={0.08 * intensity} roughness={0.06} metalness={1} envMapIntensity={2.2} />
      </mesh>
      <group ref={halo}>
        {[1.35, 2.1, 3.4].map((k, i) => (
          <mesh key={k} scale={k}>
            <sphereGeometry args={[0.38, 32, 32]} />
            <meshBasicMaterial
              color="#FFFFFF"
              transparent
              opacity={[0.06, 0.03, 0.014][i] * intensity}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <pointLight color="#FFFFFF" intensity={5 * intensity} distance={7} decay={1.6} />
    </group>
  );
}

function BeadMesh({ bead, radius, hex, metal, onToggle }: { bead: Bead; radius: number; hex: string; metal: number; onToggle?: (id: string) => void }) {
  const ref = useRef<THREE.Mesh>(null);
  const a = angleOf(bead.frac);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = bead.due && !bead.done ? 1 + Math.sin(clock.elapsedTime * 5) * 0.25 : 1;
    ref.current.scale.setScalar(pulse);
  });
  // Black glass when open, polished in the member's finish when done, lit white when due now.
  const color = bead.done ? hex : bead.late ? '#3A3A3A' : '#050505';
  const emissive = bead.done ? hex : bead.due ? '#FFFFFF' : '#000000';
  const emissiveIntensity = bead.done ? 0.35 : bead.due ? 0.9 : 0;
  return (
    <group position={[Math.cos(a) * radius, Math.sin(a) * radius, 0]}>
      <mesh ref={ref}>
        <sphereGeometry args={[bead.done ? 0.11 : 0.095, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
          metalness={bead.done ? metal : 0.9}
          roughness={bead.done ? 0.18 : 0.22}
          envMapIntensity={1.4}
        />
      </mesh>
      {onToggle && (
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onToggle(bead.id);
          }}
          onPointerOver={() => {
            if (Platform.OS === 'web') document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            if (Platform.OS === 'web') document.body.style.cursor = '';
          }}
        >
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function Ring({ ring, index, onToggle, nowFrac }: { ring: OrbitRing; index: number; onToggle?: (id: string) => void; nowFrac?: number }) {
  const radius = 1.25 + index * 0.6;
  // Each orbit sits on its own inclined plane, like an armillary sphere.
  const tiltX = Math.PI / 2 - 0.32 + (index % 2 ? 0.2 : -0.12) * (index + 1) * 0.5;
  const tiltY = (index % 2 ? -1 : 1) * 0.18 * (index + 1);
  const spin = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.z += dt * (0.05 + index * 0.012) * (index % 2 ? -1 : 1);
  });
  return (
    <group rotation={[tiltX, tiltY, 0]}>
      <group ref={spin}>
        <mesh>
          <torusGeometry args={[radius, 0.016, 16, 240]} />
          <meshStandardMaterial color={ring.hex} metalness={1} roughness={0.16} envMapIntensity={1.6} />
        </mesh>
        {/* a faint wider band for body */}
        <mesh>
          <torusGeometry args={[radius, 0.045, 12, 240]} />
          <meshStandardMaterial color={ring.hex} metalness={0.9} roughness={0.5} transparent opacity={0.08} depthWrite={false} />
        </mesh>
        {ring.beads.map((b) => (
          <BeadMesh key={b.id} bead={b} radius={radius} hex={ring.hex} metal={ring.metal} onToggle={onToggle} />
        ))}
        {index === 0 && nowFrac !== undefined && nowFrac >= 0 && nowFrac <= 1 && (
          <mesh position={[Math.cos(angleOf(nowFrac)) * radius, Math.sin(angleOf(nowFrac)) * radius, 0]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        )}
      </group>
    </group>
  );
}

/** The Go-time diamond. It brightens as the checklist fills and blazes gold when complete. */
export function Diamond({ ratio, position = [0, 0, 0], scale = 1 }: { ratio: number; position?: [number, number, number]; scale?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.7;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.3) * 0.06;
  });
  const complete = ratio >= 1;
  return (
    <mesh ref={ref} position={position} scale={[scale * 0.8, scale * 1.15, scale * 0.8]}>
      <octahedronGeometry args={[0.3, 0]} />
      <meshStandardMaterial
        color="#FFFFFF"
        emissive="#FFFFFF"
        emissiveIntensity={complete ? 0.6 : 0.02 + ratio * 0.3}
        metalness={1}
        roughness={0.06}
        flatShading
        envMapIntensity={3}
      />
    </mesh>
  );
}

/** Fixed outer bands, like the meridian and equator of an armillary sphere. */
function Armillary() {
  return (
    <group>
      {[
        { r: 2.15, rot: [Math.PI / 2 - 0.1, 0, 0] as [number, number, number] },
        { r: 2.25, rot: [0.15, 0.5, 0] as [number, number, number] },
        { r: 2.35, rot: [Math.PI / 2 + 0.55, 0.9, 0] as [number, number, number] },
      ].map((b, i) => (
        <mesh key={i} rotation={b.rot}>
          <torusGeometry args={[b.r, 0.006, 8, 300]} />
          <meshStandardMaterial color="#FFFFFF" metalness={1} roughness={0.2} transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function Dust({ count = 420 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const p = new Float32Array(count * 3);
    let s = 42;
    const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < count; i++) {
      const d = 2.8 + r() * 6;
      const th = r() * Math.PI * 2;
      const ph = Math.acos(2 * r() - 1);
      p[i * 3] = d * Math.sin(ph) * Math.cos(th);
      p[i * 3 + 1] = d * Math.cos(ph) * 0.6;
      p[i * 3 + 2] = d * Math.sin(ph) * Math.sin(th);
    }
    return p;
  }, [count]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.015;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.024} color="#FFFFFF" transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Gentle camera drift that follows the pointer (or just breathes on touch screens). */
function Rig({ distance = 6.6, height = 1.2, autoOrbit = 0 }: { distance?: number; height?: number; autoOrbit?: number }) {
  const { camera, pointer } = useThree();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const orbit = autoOrbit ? t * autoOrbit : 0;
    const tx = Math.sin(orbit) * distance + pointer.x * 0.7 + Math.sin(t * 0.3) * 0.15;
    const tz = Math.cos(orbit) * distance;
    const ty = height + pointer.y * 0.5 + Math.cos(t * 0.25) * 0.1;
    camera.position.x += (tx - camera.position.x) * 0.05;
    camera.position.y += (ty - camera.position.y) * 0.05;
    camera.position.z += (tz - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} color="#FFFFFF" />
      <directionalLight position={[-4, -2, -3]} intensity={0.9} color="#FFFFFF" />
    </>
  );
}

/**
 * The Orrery: today's routine in 3D. The glowing core is the household, each family member
 * orbits on their own inclined metal ring, every item is a bead at its minute (tap to tick
 * it off), a white spark marks now, and the Go-time diamond hovers above.
 */
export function Orrery({
  rings,
  nowFrac,
  checkpointRatio,
  onToggle,
  height = 360,
  autoOrbit = 0,
  style,
}: {
  rings: OrbitRing[];
  nowFrac?: number;
  checkpointRatio?: number;
  onToggle?: (id: string) => void;
  height?: number;
  autoOrbit?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [ready, setReady] = useState(false);
  return (
    <View style={[{ height, width: '100%', opacity: ready ? 1 : 0 }, style]}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.2, 6.6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
          setReady(true);
        }}
      >
        <StudioEnvironment />
        <Lights />
        <Rig autoOrbit={autoOrbit} />
        <Dust />
        <Core />
        <Armillary />
        {rings.map((r, i) => (
          <Ring key={r.id} ring={r} index={i} onToggle={onToggle} nowFrac={nowFrac} />
        ))}
        {checkpointRatio !== undefined && <Diamond ratio={checkpointRatio} position={[0, 1.55, 0]} scale={1.2} />}
      </Canvas>
    </View>
  );
}

/** A single floating diamond, for the Go-time panel. */
export function DiamondScene({ ratio, size = 120 }: { ratio: number; size?: number }) {
  return (
    <View style={{ width: size, height: size }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0.2, 2.2], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <StudioEnvironment />
        <Lights />
        <pointLight position={[0, -0.8, 1]} intensity={3} color="#FFFFFF" />
        <Diamond ratio={ratio} scale={1.4} />
      </Canvas>
    </View>
  );
}

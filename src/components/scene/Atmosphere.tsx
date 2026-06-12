"use client";

// Mode-aware atmosphere: gradient sky dome with a sun (or moon), optional
// starfield, soft billboard clouds, a city skyline ringing the horizon whose
// windows light up after dark, circling birds and a wide textured ground
// plane stretching to the horizon.

import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Halo } from "./glow";
import { usePBRMaps } from "./materials";
import { useSceneMode } from "./mode";

const rnd = (seed: number, i: number) => {
  const v = Math.sin(seed * 37.13 + i * 13.7) * 43758.5453;
  return v - Math.floor(v);
};

const SKY_VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const SKY_FRAG = `
varying vec3 vDir;
uniform vec3 sunDir;
uniform vec3 zenith;
uniform vec3 mid;
uniform vec3 horizon;
uniform vec3 sunTint;
uniform float bloom;
uniform float core;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -0.02, 1.0);
  vec3 col = mix(mid, zenith, smoothstep(0.16, 0.62, h));
  col = mix(horizon, col, smoothstep(0.0, 0.20, h));
  // warm haze hugging the horizon around the sun azimuth
  float s = max(dot(d, normalize(sunDir)), 0.0);
  float hz = 1.0 - smoothstep(0.0, 0.34, h);
  col += sunTint * hz * pow(s, 3.0) * bloom * 0.6;
  col += sunTint * pow(s, 14.0) * bloom;
  col += vec3(1.0, 0.95, 0.85) * pow(s, 90.0) * core;
  // subtle dither breaks up gradient banding on large monitors
  float n = fract(sin(dot(d.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.008;
  gl_FragColor = vec4(col, 1.0);
}
`;

function SkyDome() {
  const { mode, theme } = useSceneMode();
  const uniforms = useMemo(
    () => ({
      sunDir: { value: theme.sunDir },
      zenith: { value: new THREE.Color(theme.sky.zenith) },
      mid: { value: new THREE.Color(theme.sky.mid) },
      horizon: { value: new THREE.Color(theme.sky.horizon) },
      sunTint: { value: new THREE.Color(theme.sky.sunTint) },
      bloom: { value: theme.sky.bloom },
      core: { value: theme.sky.core },
    }),
    [theme]
  );
  return (
    <mesh key={mode}>
      <sphereGeometry args={[380, 48, 32]} />
      <shaderMaterial
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

function SunOrMoon() {
  const { theme } = useSceneMode();
  const p = theme.sunDir.clone().multiplyScalar(330);
  return (
    <group>
      <Halo p={[p.x, p.y, p.z]} size={theme.sun.size} color={theme.sun.color} opacity={theme.sun.opacity} />
      <Halo p={[p.x, p.y, p.z]} size={theme.sun.coreSize} color={theme.sun.coreColor} opacity={theme.sun.coreOpacity} />
    </group>
  );
}

function Stars() {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = rnd(31, i) * Math.PI * 2;
      const y = 0.06 + rnd(32, i) * 0.92;
      const xz = Math.sqrt(Math.max(0, 1 - y * y));
      pts.push(Math.cos(a) * xz * 355, y * 355, Math.sin(a) * xz * 355);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#cdd3ff" size={1.6} sizeAttenuation={false} transparent opacity={0.85} fog={false} />
    </points>
  );
}

/** Soft cumulus puff drawn once to a canvas — overlapping radial blobs. */
let cloudTex: THREE.CanvasTexture | null = null;
function cloudTexture(): THREE.CanvasTexture {
  if (!cloudTex) {
    const w = 256;
    const h = 128;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    for (let i = 0; i < 26; i++) {
      const x = w * (0.16 + rnd(71, i) * 0.68);
      // bias blobs toward a flat base with a puffy top
      const y = h * (0.62 - rnd(72, i) * rnd(73, i) * 0.38);
      const r = 14 + rnd(74, i) * 26;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      const a = 0.10 + rnd(75, i) * 0.13;
      grad.addColorStop(0, `rgba(255,255,255,${a})`);
      grad.addColorStop(0.7, `rgba(255,255,255,${a * 0.45})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    }
    cloudTex = new THREE.CanvasTexture(c);
  }
  return cloudTex;
}

/** Billboard cloud banks slowly orbiting the scene. */
function Clouds() {
  const { theme } = useSceneMode();
  const g = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (g.current) g.current.rotation.y += delta * 0.0028;
  });
  const banks = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + rnd(5, i) * 0.8;
        const r = 160 + rnd(6, i) * 130;
        return {
          x: Math.cos(a) * r,
          y: 52 + rnd(7, i) * 75,
          z: Math.sin(a) * r,
          w: (34 + rnd(8, i) * 56) * 1.6,
          h: (17 + rnd(9, i) * 22) * 1.2,
          tone: rnd(10, i),
          o: 0.4 + rnd(11, i) * 0.5,
        };
      }),
    []
  );
  const tex = cloudTexture();
  return (
    <group ref={g}>
      {banks.map((b, i) => (
        <sprite key={i} position={[b.x, b.y, b.z]} scale={[b.w, b.h, 1]}>
          <spriteMaterial
            map={tex}
            color={b.tone > 0.5 ? theme.cloudHi : theme.cloudLo}
            transparent
            opacity={theme.cloudOpacity * b.o}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/** City silhouette around the horizon + lit-window points after dark. */
function Skyline() {
  const { theme } = useSceneMode();
  const { buildings, windows } = useMemo(() => {
    const buildings: { x: number; z: number; w: number; h: number; ry: number; tone: number }[] = [];
    const pts: number[] = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2 + rnd(11, i) * 0.1;
      const r = 195 + rnd(12, i) * 85;
      const cluster = rnd(13, i) > 0.78;
      const w = 4.5 + rnd(14, i) * 6;
      const h = cluster ? 24 + rnd(15, i) * 22 : 6 + rnd(16, i) * 13;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      buildings.push({ x, z, w, h, ry: rnd(18, i) * 0.8, tone: rnd(17, i) });
      const count = Math.floor(w * h * 0.16);
      for (let k = 0; k < count; k++) {
        const face = Math.floor(rnd(19, i * 97 + k) * 4);
        const u = (rnd(20, i * 97 + k) - 0.5) * w * 0.9;
        const y = 1.5 + rnd(21, i * 97 + k) * (h - 3);
        const half = w / 2 + 0.3;
        if (face === 0) pts.push(x + u, y, z + half);
        else if (face === 1) pts.push(x + u, y, z - half);
        else if (face === 2) pts.push(x + half, y, z + u);
        else pts.push(x - half, y, z + u);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return { buildings, windows: geo };
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation={[0, b.ry, 0]}>
          <boxGeometry args={[b.w, b.h, b.w]} />
          <meshBasicMaterial color={b.tone > 0.5 ? theme.skylineA : theme.skylineB} fog={false} />
        </mesh>
      ))}
      {theme.skylineWindowOpacity > 0 && (
        <points geometry={windows}>
          <pointsMaterial
            color="#ffc06a"
            size={0.7}
            sizeAttenuation
            transparent
            opacity={theme.skylineWindowOpacity * 0.8}
            fog={false}
          />
        </points>
      )}
    </group>
  );
}

function Bird({ r, h, speed, phase }: { r: number; h: number; speed: number; phase: number }) {
  const g = useRef<THREE.Group>(null);
  const lw = useRef<THREE.Mesh>(null);
  const rw = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * speed + phase;
    if (g.current) {
      g.current.position.set(Math.cos(t) * r, h + Math.sin(t * 2.3) * 1.4, Math.sin(t) * r);
      g.current.rotation.y = (3 * Math.PI) / 2 - t;
    }
    const flap = Math.sin(clock.elapsedTime * 9 + phase) * 0.7;
    if (lw.current) lw.current.rotation.x = flap;
    if (rw.current) rw.current.rotation.x = -flap;
  });
  return (
    <group ref={g} scale={0.6}>
      <mesh>
        <boxGeometry args={[0.34, 0.05, 0.07]} />
        <meshBasicMaterial color="#231a30" fog={false} />
      </mesh>
      <mesh ref={lw} position={[0, 0, 0.04]}>
        <boxGeometry args={[0.13, 0.02, 0.4]} />
        <meshBasicMaterial color="#231a30" fog={false} />
      </mesh>
      <mesh ref={rw} position={[0, 0, -0.04]}>
        <boxGeometry args={[0.13, 0.02, 0.4]} />
        <meshBasicMaterial color="#231a30" fog={false} />
      </mesh>
    </group>
  );
}

/** Land disc with a hole under the campus pool basin (which is dug below
 * grade); ShapeGeometry UVs are world-unit. */
let landGeoCache: THREE.BufferGeometry | null = null;
function landGeo(): THREE.BufferGeometry {
  if (!landGeoCache) {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 300, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    // pool basin footprint at world (-13, 10); plane y maps to world -z
    hole.moveTo(-13 - 4.7, -10 - 2.05);
    hole.lineTo(-13 + 4.7, -10 - 2.05);
    hole.lineTo(-13 + 4.7, -10 + 2.05);
    hole.lineTo(-13 - 4.7, -10 + 2.05);
    hole.closePath();
    shape.holes.push(hole);
    landGeoCache = new THREE.ShapeGeometry(shape, 48);
  }
  return landGeoCache;
}

/** Textured land beyond the campus wall; falls back to flat colour while
 * the grass maps stream in. */
function TexturedLand() {
  const { theme } = useSceneMode();
  const maps = usePBRMaps("leafy_grass", [0.3, 0.3], { arm: false, normalScale: 0.5 });
  return (
    <mesh geometry={landGeo()} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
      <meshStandardMaterial {...maps} color={theme.land} roughness={1} />
    </mesh>
  );
}

export default function Atmosphere() {
  const { theme } = useSceneMode();
  return (
    <group>
      <SkyDome />
      <SunOrMoon />
      {theme.stars && <Stars />}
      <Clouds />
      <Skyline />
      {/* land plane stretching under the skyline */}
      <Suspense
        fallback={
          <mesh geometry={landGeo()} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
            <meshStandardMaterial color={theme.land} roughness={1} />
          </mesh>
        }
      >
        <TexturedLand />
      </Suspense>
      <Bird r={34} h={24} speed={0.14} phase={0} />
      <Bird r={40} h={27} speed={0.12} phase={2.1} />
      <Bird r={32} h={22} speed={0.16} phase={4.2} />
      <Bird r={44} h={29} speed={0.1} phase={1.1} />
      <Bird r={37} h={25} speed={0.13} phase={5.3} />
    </group>
  );
}

"use client";

// The living street outside the compound: a two-lane road with flowing
// traffic, streetlights, a glowing billboard, sidewalk pedestrians — and a
// hero car that pulls off the road, waits at the security barrier, tours the
// driveway loop and rejoins traffic. All motion runs on the render clock.

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import Car, { Bus, type CarKind } from "./Vehicles";
import { Halo, LightCone } from "./glow";
import { Walker } from "./People";
import { useSceneMode } from "./mode";
import Roadside from "./Roadside";

type V3 = [number, number, number];

const ROAD_Z = 35.2;
const ASPHALT = "#34383e";
const SIDEWALK = "#8d8779";
const damp = THREE.MathUtils.damp;

const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);

function StreetCar({
  lane,
  dir,
  speed,
  x0,
  color,
  kind,
  neon,
}: {
  lane: number;
  dir: 1 | -1;
  speed: number;
  x0: number;
  color: string;
  kind: CarKind;
  neon?: string;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const range = 190;
    let x = x0 + dir * speed * clock.elapsedTime;
    x = ((((x + 95) % range) + range) % range) - 95;
    g.current?.position.set(x, 0, lane);
  });
  return (
    <group ref={g} position={[x0, 0, lane]}>
      <Car ry={dir > 0 ? 0 : Math.PI} speed={speed} color={color} kind={kind} neon={neon} />
    </group>
  );
}

/** Hero car: street → barrier stop → driveway tour loop → exits west. */
function ArrivalCar() {
  const g = useRef<THREE.Group>(null);
  const arm = useRef<THREE.Group>(null);
  const speedRef = useRef(0);

  const { curveIn, curveTour, lenIn, lenTour } = useMemo(() => {
    const curveIn = new THREE.CatmullRomCurve3([
      v(62, 33.4),
      v(30, 33.4),
      v(14, 33.3),
      v(6.5, 32.6),
      v(2.6, 30.8),
      v(0.7, 28.6),
    ]);
    const curveTour = new THREE.CatmullRomCurve3([
      v(0.7, 28.6),
      v(0.7, 24),
      v(0.6, 19),
      v(1.2, 15.4),
      v(2.6, 12.9),
      v(0, 11.3),
      v(-2.6, 12.9),
      v(-1.2, 15.4),
      v(-0.6, 19),
      v(-0.7, 24),
      v(-0.8, 27.6),
      v(-2.2, 31.2),
      v(-5.5, 34.6),
      v(-12, 36.4),
      v(-30, 36.6),
      v(-62, 36.6),
    ]);
    return { curveIn, curveTour, lenIn: curveIn.getLength(), lenTour: curveTour.getLength() };
  }, []);

  const T_IN = 9;
  const T_WAIT = 2.4;
  const T_TOUR = 21;
  const TOTAL = T_IN + T_WAIT + T_TOUR + 1.2;

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime % TOTAL;
    const car = g.current;
    if (!car) return;
    let pos: THREE.Vector3;
    let tan: THREE.Vector3 | null = null;
    if (t < T_IN) {
      const u = Math.min(t / T_IN, 1);
      pos = curveIn.getPointAt(u);
      tan = curveIn.getTangentAt(u);
      speedRef.current = lenIn / T_IN;
    } else if (t < T_IN + T_WAIT) {
      pos = curveIn.getPointAt(1);
      tan = curveIn.getTangentAt(1);
      speedRef.current = 0;
    } else {
      const u = Math.min((t - T_IN - T_WAIT) / T_TOUR, 1);
      pos = curveTour.getPointAt(u);
      tan = curveTour.getTangentAt(u);
      speedRef.current = u >= 1 ? 0 : lenTour / T_TOUR;
    }
    car.position.copy(pos);
    if (tan) car.rotation.y = Math.atan2(-tan.z, tan.x);
    // boom barrier lifts whenever the car is near the checkpoint
    if (arm.current) {
      const near = Math.hypot(pos.x, pos.z - 24.7) < 6.5;
      arm.current.rotation.z = damp(arm.current.rotation.z, near ? -1.25 : 0, 4, delta);
    }
  });

  return (
    <group>
      <group ref={g}>
        <Car color="#e84d8a" kind="sports" speedRef={speedRef} neon="#3ec6c0" />
      </group>
      {/* security barrier just inside the gate */}
      <group position={[2.1, 0, 24.7]}>
        <mesh position={[0, 0.28, 0]} castShadow>
          <boxGeometry args={[0.14, 0.56, 0.14]} />
          <meshStandardMaterial color="#46535f" roughness={0.6} metalness={0.4} />
        </mesh>
        <group ref={arm} position={[-0.05, 0.5, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[-0.45 - i * 0.9, 0, 0]} castShadow>
              <boxGeometry args={[0.9, 0.07, 0.07]} />
              <meshStandardMaterial
                color={i % 2 ? "#e03c3c" : "#f5f1e6"}
                emissive={i % 2 ? "#e03c3c" : "#000000"}
                emissiveIntensity={i % 2 ? 0.4 : 0}
                roughness={0.6}
              />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

function StreetLight({ p, side }: { p: V3; side: 1 | -1 }) {
  const { lit } = useSceneMode();
  const head: V3 = [p[0], 2.42, p[2] + side * 0.75];
  return (
    <group>
      <mesh position={[p[0], 1.2, p[2]]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 2.4, 8]} />
        <meshStandardMaterial color="#3c454e" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={[p[0], 2.38, p[2] + (side * 0.75) / 2]} rotation={[side * 1.35, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.8, 8]} />
        <meshStandardMaterial color="#3c454e" roughness={0.5} metalness={0.5} />
      </mesh>
      <mesh position={head}>
        <boxGeometry args={[0.3, 0.07, 0.16]} />
        <meshStandardMaterial color="#ffdf9e" emissive="#ffd9a0" emissiveIntensity={lit ? 2 : 0.1} />
      </mesh>
      {lit && (
        <>
          <Halo p={head} size={1.5} color="#ffce8a" opacity={0.5} />
          <LightCone p={[head[0], head[1] - 0.02, head[2]]} h={2.5} r={1.5} opacity={0.06} />
        </>
      )}
    </group>
  );
}

/** School bus cruising the public road. */
function StreetBus({ lane, dir, speed, x0 }: { lane: number; dir: 1 | -1; speed: number; x0: number }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const range = 190;
    let x = x0 + dir * speed * clock.elapsedTime;
    x = ((((x + 95) % range) + range) % range) - 95;
    g.current?.position.set(x, 0, lane);
  });
  return (
    <group ref={g} position={[x0, 0, lane]}>
      <Bus ry={dir > 0 ? 0 : Math.PI} speed={speed} label="MITTAL INTL SCHOOL" />
    </group>
  );
}

function Billboard() {
  const { lit } = useSceneMode();
  return (
    <group position={[-44, 0, 44]}>
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 1.6, 0]} castShadow>
          <boxGeometry args={[0.18, 3.2, 0.18]} />
          <meshStandardMaterial color="#3c454e" roughness={0.5} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 4.6, 0]} castShadow>
        <boxGeometry args={[7.4, 3.4, 0.25]} />
        <meshStandardMaterial color="#171026" roughness={0.7} />
      </mesh>
      {/* neon frame */}
      <mesh position={[0, 4.6, -0.14]}>
        <boxGeometry args={[7.5, 3.5, 0.03]} />
        <meshStandardMaterial color="#e84d8a" emissive="#e84d8a" emissiveIntensity={lit ? 1.6 : 0.25} />
      </mesh>
      {lit && <Halo p={[-3.5, 6.2, -0.2]} size={1.2} color="#ff7ab0" opacity={0.45} />}
      {lit && <Halo p={[3.5, 6.2, -0.2]} size={1.2} color="#ff7ab0" opacity={0.45} />}
      <Html position={[0, 4.6, -0.2]} center distanceFactor={24} zIndexRange={[15, 0]}>
        <div className="pointer-events-none select-none whitespace-nowrap text-center">
          <p className="text-[20px] font-black leading-tight tracking-tight text-amber-200 drop-shadow">MAHARACK HEIGHTS</p>
          <p className="text-[10px] font-semibold tracking-[0.35em] text-pink-300">LIVE ABOVE IT ALL</p>
        </div>
      </Html>
    </group>
  );
}

export default function Traffic() {
  return (
    <group>
      {/* road bed + lane markings */}
      <mesh position={[0, -0.035, ROAD_Z]} receiveShadow>
        <boxGeometry args={[240, 0.1, 6.6]} />
        <meshStandardMaterial color={ASPHALT} roughness={0.95} />
      </mesh>
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} position={[-116 + i * 8, 0.018, ROAD_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 0.12]} />
          <meshStandardMaterial color="#e8d77f" roughness={0.9} />
        </mesh>
      ))}
      {/* kerb lines + sidewalks */}
      {[ROAD_Z - 3.45, ROAD_Z + 3.45].map((z) => (
        <mesh key={z} position={[0, -0.02, z]} receiveShadow>
          <boxGeometry args={[240, 0.09, 0.25]} />
          <meshStandardMaterial color="#b7b2a4" roughness={0.9} />
        </mesh>
      ))}
      {[ROAD_Z - 4.2, ROAD_Z + 4.2].map((z) => (
        <mesh key={z} position={[0, -0.025, z]} receiveShadow>
          <boxGeometry args={[240, 0.08, 1.3]} />
          <meshStandardMaterial color={SIDEWALK} roughness={1} />
        </mesh>
      ))}
      {/* crosswalk at the gate */}
      {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
        <mesh key={x} position={[x, 0.02, ROAD_Z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 6.0]} />
          <meshStandardMaterial color="#ece9df" roughness={0.9} />
        </mesh>
      ))}

      {/* flowing traffic */}
      <StreetCar lane={ROAD_Z - 1.7} dir={-1} speed={7} x0={0} color="#3ec6c0" kind="sports" />
      <StreetCar lane={ROAD_Z - 1.7} dir={-1} speed={5.6} x0={70} color="#f3a33c" kind="suv" />
      <StreetCar lane={ROAD_Z - 1.7} dir={-1} speed={6.1} x0={140} color="#e0e4e8" kind="sedan" />
      <StreetCar lane={ROAD_Z + 1.7} dir={1} speed={6.4} x0={30} color="#7c5cff" kind="sedan" />
      <StreetCar lane={ROAD_Z + 1.7} dir={1} speed={8.2} x0={100} color="#ff5a3c" kind="sports" neon="#7c5cff" />
      <StreetCar lane={ROAD_Z + 1.7} dir={1} speed={5.1} x0={160} color="#4da6ff" kind="suv" />
      {/* school buses doing their rounds */}
      <StreetBus lane={ROAD_Z - 1.7} dir={-1} speed={4.6} x0={105} />
      <StreetBus lane={ROAD_Z + 1.7} dir={1} speed={4.3} x0={-60} />
      <ArrivalCar />

      {/* parked along the kerb */}
      <Car p={[16, 0, ROAD_Z - 2.9]} ry={Math.PI} color="#e8c14d" kind="sedan" lights={false} />
      <Car p={[-22, 0, ROAD_Z + 2.9]} ry={0} color="#46b46e" kind="suv" lights={false} />

      {/* streetlights along both kerbs */}
      {[-36, -12, 12, 36].map((x) => (
        <StreetLight key={x} p={[x, 0, ROAD_Z - 3.9]} side={1} />
      ))}
      {[-24, 0, 24, 48].map((x) => (
        <StreetLight key={x} p={[x, 0, ROAD_Z + 3.9]} side={-1} />
      ))}

      <Billboard />
      <Roadside />

      {/* sidewalk pedestrians */}
      <Walker
        path={[
          [-30, ROAD_Z + 4.0],
          [30, ROAD_Z + 4.0],
          [30, ROAD_Z + 4.5],
          [-30, ROAD_Z + 4.5],
        ]}
        speed={0.6}
        shirt="#e8c14d"
        pants="#3a4660"
      />
      <Walker
        path={[
          [22, ROAD_Z - 4.0],
          [-22, ROAD_Z - 4.0],
          [-22, ROAD_Z - 4.45],
          [22, ROAD_Z - 4.45],
        ]}
        speed={0.5}
        offset={20}
        shirt="#3ec6c0"
        pants="#5a4a3a"
        skin="#a8754f"
      />
    </group>
  );
}

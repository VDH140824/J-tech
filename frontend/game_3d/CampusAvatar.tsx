import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group, MathUtils } from "three";
import type { ToadAction } from "./CampusToadInteraction";

export interface AvatarMotion {
  speed: number;
  running: boolean;
  seated?: boolean;
  gesture?: { action: ToadAction; progress: number };
}

export function CampusAvatar({ name, motion }: { name: string; motion: MutableRefObject<AvatarMotion> }) {
  const leftArm = useRef<Group>(null);
  const rightArm = useRef<Group>(null);
  const leftForearm = useRef<Group>(null);
  const rightForearm = useRef<Group>(null);
  const leftHand = useRef<Group>(null);
  const rightHand = useRef<Group>(null);
  const upperBody = useRef<Group>(null);
  const leftLeg = useRef<Group>(null);
  const rightLeg = useRef<Group>(null);
  const leftKnee = useRef<Group>(null);
  const rightKnee = useRef<Group>(null);
  const torso = useRef<Group>(null);
  const animation = useRef({ phase: 0, strength: 0, seated: 0, touch: 0, pray: 0 });

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const state = animation.current;
    const gesture = motion.current.gesture;
    const progress = gesture?.progress ?? 0;
    const envelope = gesture ? MathUtils.smoothstep(progress, 0, 0.18) * (1 - MathUtils.smoothstep(progress, 0.8, 1)) : 0;
    state.touch = MathUtils.damp(state.touch, gesture?.action === "touch" ? envelope : 0, 16, dt);
    state.pray = MathUtils.damp(state.pray, gesture?.action === "pray" ? envelope : 0, 16, dt);
    state.seated = MathUtils.damp(state.seated, motion.current.seated ? 1 : 0, 12, dt);
    state.strength = MathUtils.damp(state.strength, motion.current.seated ? 0 : Math.min(motion.current.speed / 3.2, 1), 12, dt);
    state.phase += dt * (motion.current.running ? 12 : 8);
    const swing = Math.sin(state.phase) * state.strength * (motion.current.running ? 0.8 : 0.5);
    if (leftArm.current) leftArm.current.rotation.set(-swing - state.seated * 1.1 - state.pray * 0.65, 0, state.pray * 0.25);
    if (rightArm.current) rightArm.current.rotation.set(swing - state.seated * 1.1 - state.touch * 1.56 - state.pray * 0.65, 0, -state.pray * 0.25);
    if (leftForearm.current) leftForearm.current.rotation.set(-state.pray * 1.8, 0, state.pray * 0.95);
    if (rightForearm.current) rightForearm.current.rotation.set(-state.pray * 1.8, 0, -state.pray * 0.95);
    for (const hand of [leftHand.current, rightHand.current]) hand?.scale.set(1 - state.pray * 0.55, 1 + state.pray * 0.15, 1);
    const bow = gesture?.action === "pray" ? Math.sin(MathUtils.clamp((progress - 0.25) / 0.5, 0, 1) * Math.PI) : 0;
    if (upperBody.current) upperBody.current.rotation.x = state.touch * 0.14 + state.pray * bow * 0.3;
    if (leftLeg.current) leftLeg.current.rotation.x = swing - state.seated * Math.PI / 2;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing - state.seated * Math.PI / 2;
    if (leftKnee.current) leftKnee.current.rotation.x = state.seated * Math.PI / 2;
    if (rightKnee.current) rightKnee.current.rotation.x = state.seated * Math.PI / 2;
    if (torso.current) torso.current.position.y = -0.74 + Math.abs(Math.sin(state.phase)) * state.strength * 0.025;
  });

  return (
    <group>
      <Html position={[0, 2.05, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
        <div className="campus-player-name" title={name}>{name}</div>
      </Html>
      <group ref={upperBody} position={[0, 0.74, 0]}>
        <group ref={torso} position={[0, -0.74, 0]}>
          {/* Main FPT signature orange jacket */}
          <mesh position={[0, 1.02, 0]} scale={[1, 1, 0.68]}>
            <capsuleGeometry args={[0.23, 0.25, 4, 16]} />
            <meshStandardMaterial color="#ea5b0c" roughness={0.78} />
          </mesh>

          {/* Jacket lower navy hem */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.42, 0.16, 0.28]} />
            <meshStandardMaterial color="#1c2536" roughness={0.85} />
          </mesh>

          {/* Jacket front center zipper line */}
          <mesh position={[0, 0.98, 0.175]}>
            <boxGeometry args={[0.02, 0.34, 0.015]} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.4} metalness={0.6} />
          </mesh>

          {/* FPT Student Orange Lanyard (Dây thẻ sinh viên) */}
          <mesh position={[0, 1.15, 0.17]}>
            <boxGeometry args={[0.08, 0.22, 0.01]} />
            <meshStandardMaterial color="#f97316" roughness={0.7} />
          </mesh>
          {/* Student ID Card Badge */}
          <mesh position={[0, 0.95, 0.178]}>
            <boxGeometry args={[0.08, 0.11, 0.008]} />
            <meshStandardMaterial color="#ffffff" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0.99, 0.182]}>
            <boxGeometry args={[0.075, 0.025, 0.005]} />
            <meshStandardMaterial color="#1e3a8a" roughness={0.5} />
          </mesh>

          {/* Neck */}
          <mesh position={[0, 1.32, 0]}>
            <cylinderGeometry args={[0.075, 0.082, 0.13, 12]} />
            <meshStandardMaterial color="#fad5b8" roughness={0.68} />
          </mesh>

          {/* Head & Face */}
          <mesh position={[0, 1.52, 0]} scale={[0.94, 1.06, 0.92]}>
            <sphereGeometry args={[0.205, 20, 16]} />
            <meshStandardMaterial color="#fad5b8" roughness={0.68} />
          </mesh>

          {/* Ears */}
          {[-1, 1].map((side) => (
            <mesh key={`ear-${side}`} position={[side * 0.2, 1.51, 0]} scale={[0.4, 0.8, 0.5]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial color="#fad5b8" roughness={0.68} />
            </mesh>
          ))}

          {/* Layered Modern Hair */}
          <mesh position={[0, 1.56, -0.02]} scale={[0.98, 1.08, 0.96]}>
            <sphereGeometry args={[0.218, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color="#221e25" roughness={0.75} />
          </mesh>
          {/* Hair fringe / bangs */}
          <mesh position={[0, 1.63, 0.13]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.24, 0.07, 0.08]} />
            <meshStandardMaterial color="#221e25" roughness={0.75} />
          </mesh>

          {/* Eyes with lifelike highlights */}
          {[-1, 1].map((side) => (
            <group key={`eye-${side}`} position={[side * 0.07, 1.53, 0.18]}>
              <mesh>
                <sphereGeometry args={[0.022, 12, 10]} />
                <meshStandardMaterial color="#18181b" roughness={0.2} />
              </mesh>
              {/* Eye sparkle reflection */}
              <mesh position={[side * 0.005, 0.008, 0.015]}>
                <sphereGeometry args={[0.007, 6, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} />
              </mesh>
            </group>
          ))}

          {/* Modern Student Tech Backpack */}
          <mesh position={[0, 1.03, -0.19]}>
            <boxGeometry args={[0.34, 0.42, 0.17]} />
            <meshStandardMaterial color="#1e293b" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.96, -0.28]}>
            <boxGeometry args={[0.26, 0.24, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.88} />
          </mesh>
          {/* Backpack orange accent tag */}
          <mesh position={[0, 1.18, -0.2]}>
            <boxGeometry args={[0.09, 0.025, 0.02]} />
            <meshStandardMaterial color="#ea5b0c" roughness={0.7} />
          </mesh>

          {/* Arms */}
          {[-1, 1].map((side) => (
            <group key={`arm-${side}`} ref={side < 0 ? leftArm : rightArm} position={[side * 0.31, 1.23, 0]}>
              {/* Upper arm with jacket sleeve */}
              <mesh position={[0, -0.125, 0]}>
                <capsuleGeometry args={[0.075, 0.11, 4, 10]} />
                <meshStandardMaterial color="#ea5b0c" roughness={0.78} />
              </mesh>
              {/* Sleeve dark navy cuff */}
              <mesh position={[0, -0.21, 0]}>
                <cylinderGeometry args={[0.076, 0.076, 0.035, 12]} />
                <meshStandardMaterial color="#1c2536" roughness={0.85} />
              </mesh>

              <group ref={side < 0 ? leftForearm : rightForearm} position={[0, -0.25, 0]}>
                <mesh position={[0, -0.12, 0]}>
                  <capsuleGeometry args={[0.06, 0.13, 4, 10]} />
                  <meshStandardMaterial color="#fad5b8" roughness={0.68} />
                </mesh>

                {/* Smartwatch on left wrist */}
                {side < 0 && (
                  <group position={[0, -0.2, 0]}>
                    <mesh>
                      <cylinderGeometry args={[0.065, 0.065, 0.03, 12]} />
                      <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.7} />
                    </mesh>
                    <mesh position={[0, 0, 0.066]}>
                      <boxGeometry args={[0.03, 0.03, 0.005]} />
                      <meshStandardMaterial color="#38bdf8" roughness={0.2} />
                    </mesh>
                  </group>
                )}

                {/* Hand with palm and thumb */}
                <group ref={side < 0 ? leftHand : rightHand} position={[0, -0.27, 0]}>
                  <mesh scale={[1, 1.15, 0.8]}>
                    <sphereGeometry args={[0.065, 10, 8]} />
                    <meshStandardMaterial color="#fad5b8" roughness={0.68} />
                  </mesh>
                  {/* Thumb */}
                  <mesh position={[side * -0.045, -0.015, 0.02]} rotation={[0, 0, side * -0.4]} scale={[0.7, 1.2, 0.7]}>
                    <sphereGeometry args={[0.03, 6, 6]} />
                    <meshStandardMaterial color="#fad5b8" roughness={0.68} />
                  </mesh>
                </group>
              </group>
            </group>
          ))}
        </group>
      </group>

      {/* Legs & Realistic Sneakers */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.115, 0.72, 0]}>
          {/* Upper leg (Pants) */}
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.088, 0.18, 4, 10]} />
            <meshStandardMaterial color="#1e293b" roughness={0.85} />
          </mesh>

          <group ref={side < 0 ? leftKnee : rightKnee} position={[0, -0.33, 0]}>
            {/* Lower leg */}
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.078, 0.18, 4, 10]} />
              <meshStandardMaterial color="#1e293b" roughness={0.85} />
            </mesh>

            {/* Realistic Sneaker */}
            <group position={[0, -0.31, 0.055]}>
              {/* White rubber sole / midsole */}
              <mesh position={[0, -0.045, 0]}>
                <boxGeometry args={[0.16, 0.04, 0.32]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.45} />
              </mesh>
              {/* Sneaker main upper body (dark navy / black) */}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.15, 0.09, 0.29]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
              {/* Sneaker front toe cap (white rubber) */}
              <mesh position={[0, -0.015, 0.13]}>
                <boxGeometry args={[0.14, 0.065, 0.06]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.45} />
              </mesh>
              {/* Orange athletic stripe accent */}
              <mesh position={[side * 0.078, 0.01, -0.01]}>
                <boxGeometry args={[0.005, 0.04, 0.14]} />
                <meshStandardMaterial color="#ea5b0c" roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

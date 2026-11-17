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
      <Html position={[0, 2.03, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
        <div className="campus-player-name" title={name}>{name}</div>
      </Html>
      <group ref={upperBody} position={[0, 0.74, 0]}>
        <group ref={torso} position={[0, -0.74, 0]}>
          <mesh position={[0, 1.02, 0]} scale={[1, 1, 0.66]}>
            <capsuleGeometry args={[0.23, 0.24, 4, 12]} />
            <meshStandardMaterial color="#f08035" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.74, 0]}>
            <boxGeometry args={[0.4, 0.17, 0.27]} />
            <meshStandardMaterial color="#23344c" />
          </mesh>
          <mesh position={[0, 1.32, 0]}>
            <cylinderGeometry args={[0.075, 0.08, 0.13, 10]} />
            <meshStandardMaterial color="#e7b48d" />
          </mesh>
          <mesh position={[0, 1.52, 0]} scale={[0.93, 1.08, 0.92]}>
            <sphereGeometry args={[0.205, 16, 12]} />
            <meshStandardMaterial color="#edbf98" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.55, -0.015]} scale={[0.96, 1.1, 0.95]}>
            <sphereGeometry args={[0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
            <meshStandardMaterial color="#28252b" roughness={1} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * 0.07, 1.53, 0.179]}>
              <sphereGeometry args={[0.021, 8, 6]} />
              <meshStandardMaterial color="#242630" />
            </mesh>
          ))}
          <mesh position={[0, 1.02, -0.18]}>
            <boxGeometry args={[0.32, 0.4, 0.16]} />
            <meshStandardMaterial color="#345a69" roughness={0.9} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? leftArm : rightArm} position={[side * 0.3, 1.23, 0]}>
              <mesh position={[0, -0.125, 0]}>
                <capsuleGeometry args={[0.075, 0.1, 3, 8]} />
                <meshStandardMaterial color="#f08035" />
              </mesh>
              <group ref={side < 0 ? leftForearm : rightForearm} position={[0, -0.25, 0]}>
                <mesh position={[0, -0.12, 0]}>
                  <capsuleGeometry args={[0.06, 0.12, 3, 8]} />
                  <meshStandardMaterial color="#edbf98" />
                </mesh>
                <group ref={side < 0 ? leftHand : rightHand} position={[0, -0.27, 0]}>
                  <mesh>
                    <sphereGeometry args={[0.075, 8, 6]} />
                    <meshStandardMaterial color="#edbf98" />
                  </mesh>
                </group>
              </group>
            </group>
          ))}
        </group>
      </group>
      {[-1, 1].map((side) => (
        <group key={side} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.115, 0.72, 0]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.085, 0.17, 3, 8]} />
            <meshStandardMaterial color="#23344c" roughness={0.9} />
          </mesh>
          <group ref={side < 0 ? leftKnee : rightKnee} position={[0, -0.33, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.075, 0.17, 3, 8]} />
              <meshStandardMaterial color="#23344c" roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.31, 0.055]}>
              <boxGeometry args={[0.18, 0.14, 0.3]} />
              <meshStandardMaterial color="#f3eee8" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Group, MathUtils } from "three";
import type { ToadAction } from "./CampusToadInteraction";
import {
  HAIR_COLOR_OPTIONS,
  OUTFIT_OPTIONS,
  loadCharacterCustomization,
  type CharacterCustomization,
} from "./campusCharacterStyles";

export type CampusCharacter = "male" | "female";

export interface AvatarMotion {
  speed: number;
  running: boolean;
  seated?: boolean;
  gesture?: { action: ToadAction; progress: number };
}

export function CampusAvatar({
  character,
  name,
  motion,
  customization,
}: {
  character: CampusCharacter;
  name?: string;
  motion: MutableRefObject<AvatarMotion>;
  customization?: CharacterCustomization;
}) {
  const female = character === "female";
  const activeCustom = customization ?? loadCharacterCustomization(character);
  const outfitConfig = OUTFIT_OPTIONS.find((o) => o.id === activeCustom.outfit) ?? OUTFIT_OPTIONS[0];
  const hairColorConfig = HAIR_COLOR_OPTIONS.find((h) => h.id === activeCustom.hairColor) ?? HAIR_COLOR_OPTIONS[0];

  const jacketColor = female ? outfitConfig.jacketColorFemale : outfitConfig.jacketColorMale;
  const pantsColor = outfitConfig.pantsColor;
  const accentColor = outfitConfig.accentColor;
  const hairColor = hairColorConfig.hex;
  const showGlasses = activeCustom.accessory === "glasses" || activeCustom.accessory === "both";
  const showHeadphones = activeCustom.accessory === "headphones" || activeCustom.accessory === "both";

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
    state.phase += dt * (motion.current.running ? 12 : motion.current.speed > 0.1 ? 8 : 2.5);

    // Natural idle breathing & arm sway
    const isMoving = state.strength > 0.05;
    const idleBreath = isMoving ? 0 : Math.sin(state.phase) * 0.012;
    const swing = Math.sin(state.phase) * state.strength * (motion.current.running ? 0.8 : 0.5);

    if (leftArm.current) leftArm.current.rotation.set(-swing - state.seated * 1.1 - state.pray * 0.65, 0, state.pray * 0.25 + (isMoving ? 0 : 0.08));
    if (rightArm.current) rightArm.current.rotation.set(swing - state.seated * 1.1 - state.touch * 1.56 - state.pray * 0.65, 0, -state.pray * 0.25 - (isMoving ? 0 : 0.08));
    if (leftForearm.current) leftForearm.current.rotation.set(-state.pray * 1.8, 0, state.pray * 0.95);
    if (rightForearm.current) rightForearm.current.rotation.set(-state.pray * 1.8, 0, -state.pray * 0.95);
    for (const hand of [leftHand.current, rightHand.current]) hand?.scale.set(1 - state.pray * 0.55, 1 + state.pray * 0.15, 1);
    const bow = gesture?.action === "pray" ? Math.sin(MathUtils.clamp((progress - 0.25) / 0.5, 0, 1) * Math.PI) : 0;
    if (upperBody.current) upperBody.current.rotation.x = state.touch * 0.14 + state.pray * bow * 0.3;
    if (leftLeg.current) leftLeg.current.rotation.x = swing - state.seated * Math.PI / 2;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing - state.seated * Math.PI / 2;
    if (leftKnee.current) leftKnee.current.rotation.x = state.seated * Math.PI / 2;
    if (rightKnee.current) rightKnee.current.rotation.x = state.seated * Math.PI / 2;
    if (torso.current) torso.current.position.y = -0.74 + (isMoving ? Math.abs(Math.sin(state.phase)) * state.strength * 0.025 : idleBreath);
  });

  return (
    <group>
      {name && (
        <Html position={[0, 2.05, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
          <div className="campus-player-name" title={name}>{name}</div>
        </Html>
      )}
      <group ref={upperBody} position={[0, 0.74, 0]}>
        <group ref={torso} position={[0, -0.74, 0]}>
          {/* Main Torso / Jacket */}
          <mesh position={[0, 1.02, 0]} scale={[1, 1, 0.68]}>
            <capsuleGeometry args={[0.23, 0.25, 4, 16]} />
            <meshStandardMaterial color={jacketColor} roughness={0.75} />
          </mesh>

          {/* Jacket lower hem */}
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.42, 0.16, 0.28]} />
            <meshStandardMaterial color={pantsColor} roughness={0.85} />
          </mesh>

          {/* Front Zipper line or Sport Stripe (hide for Vovinam martial uniform) */}
          {activeCustom.outfit !== "sport-white" && (
            <mesh position={[0, 0.98, 0.175]}>
              <boxGeometry args={[0.022, 0.34, 0.015]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.7} />
            </mesh>
          )}

          {/* Outfit-specific design accents */}
          {activeCustom.outfit === "fptu-orange" && (
            <>
              {/* FPT Student Orange Lanyard */}
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
                <meshStandardMaterial color="#ea580c" roughness={0.5} />
              </mesh>
            </>
          )}

          {activeCustom.outfit === "cyber-black" && (
            <>
              {/* Glowing Cyber Accent Stripes */}
              <mesh position={[-0.1, 1.0, 0.175]}>
                <boxGeometry args={[0.015, 0.26, 0.01]} />
                <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
              </mesh>
              <mesh position={[0.1, 1.0, 0.175]}>
                <boxGeometry args={[0.015, 0.26, 0.01]} />
                <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.6} />
              </mesh>
            </>
          )}

          {activeCustom.outfit === "sport-white" && (
            <>
              {/* Vovinam Cross Collar (Vạt áo võ Vovinam) */}
              <mesh position={[0.03, 1.1, 0.175]} rotation={[0, 0, -0.32]}>
                <boxGeometry args={[0.022, 0.28, 0.008]} />
                <meshStandardMaterial color="#1e3a8a" roughness={0.6} />
              </mesh>

              {/* Vovinam Chest Badge (Phù hiệu Vovinam Việt Võ Đạo bên ngực trái) */}
              <group position={[-0.09, 1.08, 0.178]}>
                <mesh>
                  <boxGeometry args={[0.045, 0.055, 0.006]} />
                  <meshStandardMaterial color="#eab308" roughness={0.4} />
                </mesh>
                <mesh position={[0, 0, 0.004]}>
                  <boxGeometry args={[0.032, 0.04, 0.006]} />
                  <meshStandardMaterial color="#dc2626" roughness={0.4} />
                </mesh>
              </group>

              {/* Vovinam Belt around Waist (Đai xanh quấn quanh hông) */}
              <mesh position={[0, 0.82, 0]}>
                <boxGeometry args={[0.435, 0.075, 0.295]} />
                <meshStandardMaterial color="#1e40af" roughness={0.65} />
              </mesh>
              {/* Belt Knot at front hip (Nút thắt đai Vovinam) */}
              <mesh position={[0.06, 0.82, 0.16]}>
                <boxGeometry args={[0.065, 0.07, 0.03]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
              </mesh>
              {/* Belt Tails hanging down (Dải đai xanh buông xuống hông) */}
              <mesh position={[0.05, 0.70, 0.165]} rotation={[0, 0, 0.06]}>
                <boxGeometry args={[0.042, 0.17, 0.012]} />
                <meshStandardMaterial color="#1e40af" roughness={0.65} />
              </mesh>
              <mesh position={[0.085, 0.68, 0.162]} rotation={[0, 0, -0.08]}>
                <boxGeometry args={[0.038, 0.19, 0.012]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.65} />
              </mesh>
            </>
          )}

          {activeCustom.outfit === "bomber-blue" && (
            <>
              {/* Bomber Collar Accent */}
              <mesh position={[0, 1.25, 0.02]}>
                <torusGeometry args={[0.13, 0.025, 8, 20]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
            </>
          )}

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

          {/* Layered Hair */}
          <mesh position={[0, 1.56, -0.02]} scale={[0.98, 1.08, 0.96]}>
            <sphereGeometry args={[0.218, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
            <meshStandardMaterial color={hairColor} roughness={0.75} />
          </mesh>
          {female ? (
            <>
              <mesh position={[-0.067, 1.655, 0.133]} rotation={[-0.25, 0, 0.36]} scale={[1.4, 0.48, 0.8]}>
                <sphereGeometry args={[0.103, 16, 12]} />
                <meshStandardMaterial color={hairColor} roughness={0.75} />
              </mesh>
              <mesh position={[0.137, 1.615, 0.118]} rotation={[0, 0, 0.65]} scale={[0.48, 1, 0.58]}>
                <sphereGeometry args={[0.088, 12, 10]} />
                <meshStandardMaterial color={hairColor} roughness={0.75} />
              </mesh>
              <mesh position={[0.105, 1.61, -0.216]} rotation={[Math.PI / 2, 0, 0.2]}>
                <cylinderGeometry args={[0.065, 0.065, 0.047, 12]} />
                <meshStandardMaterial color={accentColor} roughness={0.75} />
              </mesh>
              <mesh position={[0.179, 1.442, -0.257]} rotation={[-0.26, 0, 0.46]} scale={[0.83, 1, 0.84]}>
                <capsuleGeometry args={[0.088, 0.24, 6, 12]} />
                <meshStandardMaterial color={hairColor} roughness={0.75} />
              </mesh>
              {[-1, 1].map((side) => (
                <mesh key={side} position={[side * 0.213, 1.483, 0.014]}>
                  <sphereGeometry args={[0.013, 8, 6]} />
                  <meshStandardMaterial color="#e8ad55" roughness={0.42} metalness={0.4} />
                </mesh>
              ))}
            </>
          ) : (
            <mesh position={[0, 1.63, 0.13]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.24, 0.07, 0.08]} />
              <meshStandardMaterial color={hairColor} roughness={0.75} />
            </mesh>
          )}

          {/* Eyes with highlights */}
          {[-1, 1].map((side) => (
            <group key={`eye-${side}`} position={[side * 0.07, 1.53, 0.18]}>
              <mesh>
                <sphereGeometry args={[0.022, 12, 10]} />
                <meshStandardMaterial color="#18181b" roughness={0.2} />
              </mesh>
              <mesh position={[side * 0.005, 0.008, 0.015]}>
                <sphereGeometry args={[0.007, 6, 6]} />
                <meshStandardMaterial color="#ffffff" roughness={0.1} />
              </mesh>
            </group>
          ))}

          {/* ACCESSORY: Glasses (Kính tri thức) */}
          {showGlasses && (
            <group position={[0, 1.53, 0.185]}>
              {[-1, 1].map((side) => (
                <group key={`glass-${side}`} position={[side * 0.07, 0, 0]}>
                  {/* Rim */}
                  <mesh>
                    <boxGeometry args={[0.068, 0.046, 0.008]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
                  </mesh>
                  {/* Clear Glass Lens */}
                  <mesh position={[0, 0, 0.003]}>
                    <boxGeometry args={[0.056, 0.036, 0.004]} />
                    <meshStandardMaterial color="#bae6fd" roughness={0.1} transparent opacity={0.65} />
                  </mesh>
                  {/* Temple to ear */}
                  <mesh position={[side * 0.038, 0, -0.09]} rotation={[0, side * 0.05, 0]}>
                    <boxGeometry args={[0.006, 0.006, 0.18]} />
                    <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
                  </mesh>
                </group>
              ))}
              {/* Nose Bridge */}
              <mesh position={[0, 0, 0]}>
                <boxGeometry args={[0.035, 0.008, 0.008]} />
                <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
              </mesh>
            </group>
          )}

          {/* ACCESSORY: Headphones (Tai nghe Gaming/Study Pro) */}
          {showHeadphones && (
            <group position={[0, 1.54, 0]}>
              {/* Headband arching over head */}
              <mesh position={[0, 0.205, -0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.225, 0.02, 8, 24, Math.PI]} />
                <meshStandardMaterial color="#090d16" roughness={0.4} metalness={0.6} />
              </mesh>
              {[-1, 1].map((side) => (
                <group key={`headphone-cup-${side}`} position={[side * 0.23, -0.02, 0]} rotation={[0, 0, side * -0.08]}>
                  {/* Ear cushion */}
                  <mesh rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.055, 0.055, 0.03, 16]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.8} />
                  </mesh>
                  {/* Outer shell */}
                  <mesh position={[side * 0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.058, 0.058, 0.015, 16]} />
                    <meshStandardMaterial color="#090d16" roughness={0.3} metalness={0.7} />
                  </mesh>
                  {/* Glowing Accent Ring */}
                  <mesh position={[side * 0.028, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                    <cylinderGeometry args={[0.032, 0.032, 0.005, 16]} />
                    <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.8} />
                  </mesh>
                </group>
              ))}
            </group>
          )}

          {/* Student Backpack */}
          <mesh position={[0, 1.03, -0.19]}>
            <boxGeometry args={[0.34, 0.42, 0.17]} />
            <meshStandardMaterial color="#1e293b" roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.96, -0.28]}>
            <boxGeometry args={[0.26, 0.24, 0.04]} />
            <meshStandardMaterial color="#0f172a" roughness={0.88} />
          </mesh>
          {/* Backpack Accent Tag */}
          <mesh position={[0, 1.18, -0.2]}>
            <boxGeometry args={[0.09, 0.025, 0.02]} />
            <meshStandardMaterial color={accentColor} roughness={0.7} />
          </mesh>

          {/* Arms */}
          {[-1, 1].map((side) => (
            <group key={`arm-${side}`} ref={side < 0 ? leftArm : rightArm} position={[side * 0.31, 1.23, 0]}>
              {/* Upper arm with sleeve */}
              <mesh position={[0, -0.125, 0]}>
                <capsuleGeometry args={[0.075, 0.11, 4, 10]} />
                <meshStandardMaterial color={jacketColor} roughness={0.78} />
              </mesh>
              {/* Sleeve cuff */}
              <mesh position={[0, -0.21, 0]}>
                <cylinderGeometry args={[0.076, 0.076, 0.035, 12]} />
                <meshStandardMaterial color={pantsColor} roughness={0.85} />
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
                      <meshStandardMaterial color={accentColor} emissive={accentColor} emissiveIntensity={0.5} roughness={0.2} />
                    </mesh>
                  </group>
                )}

                {/* Hand */}
                <group ref={side < 0 ? leftHand : rightHand} position={[0, -0.27, 0]}>
                  <mesh scale={[1, 1.15, 0.8]}>
                    <sphereGeometry args={[0.065, 10, 8]} />
                    <meshStandardMaterial color="#fad5b8" roughness={0.68} />
                  </mesh>
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

      {/* Legs & Sneakers */}
      {[-1, 1].map((side) => (
        <group key={`leg-${side}`} ref={side < 0 ? leftLeg : rightLeg} position={[side * 0.115, 0.72, 0]}>
          {/* Upper leg (Pants) */}
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.088, 0.18, 4, 10]} />
            <meshStandardMaterial color={pantsColor} roughness={0.85} />
          </mesh>

          <group ref={side < 0 ? leftKnee : rightKnee} position={[0, -0.33, 0]}>
            {/* Lower leg */}
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.078, 0.18, 4, 10]} />
              <meshStandardMaterial color={pantsColor} roughness={0.85} />
            </mesh>

            {/* Sneaker */}
            <group position={[0, -0.31, 0.055]}>
              {/* White rubber sole */}
              <mesh position={[0, -0.045, 0]}>
                <boxGeometry args={[0.16, 0.04, 0.32]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.45} />
              </mesh>
              {/* Sneaker body */}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.15, 0.09, 0.29]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
              {/* Sneaker toe cap */}
              <mesh position={[0, -0.015, 0.13]}>
                <boxGeometry args={[0.14, 0.065, 0.06]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.45} />
              </mesh>
              {/* Stripe accent */}
              <mesh position={[side * 0.078, 0.01, -0.01]}>
                <boxGeometry args={[0.005, 0.04, 0.14]} />
                <meshStandardMaterial color={accentColor} roughness={0.6} />
              </mesh>
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}

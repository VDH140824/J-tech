import { useEffect, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, Stars } from "@react-three/drei";
import { Group, PointLight, Points, type Vector3 } from "three";
import type { CampusWorld } from "./campusWorld";
import type { DoorInteraction } from "./CampusDoors";
import { createCampusLighting, nearbyCampusLights, type CampusLightAnchor, type CampusLighting, type CampusTime } from "./campusLighting";

function NightSky() {
  const sky = useRef<Group>(null);
  const stars = useRef<Points>(null);
  useEffect(() => {
    // Drei attaches this shader as a primitive, so release it explicitly.
    const material = stars.current?.material;
    return () => {
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material?.dispose();
    };
  }, []);
  useFrame(({ camera }) => { sky.current?.position.copy(camera.position); });
  return (
    <group ref={sky}>
      <Stars ref={stars} radius={150} depth={50} count={2000} factor={1.8} saturation={0.1} fade speed={0.08} />
      <Billboard position={[85, 65, -170]}>
        <mesh>
          <circleGeometry args={[6.5, 48]} />
          <meshBasicMaterial color="#c8d9ff" transparent opacity={0.035} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <circleGeometry args={[5.6, 48]} />
          <meshBasicMaterial color="#fff0c7" transparent opacity={0.06} depthWrite={false} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[4.5, 48]} />
          <meshBasicMaterial color="#fff1ce" toneMapped={false} />
        </mesh>
        {[
          [-1.6, 1.3, 0.8], [1.1, -0.8, 1.1], [-1.8, -1.6, 0.45], [1.8, 1.6, 0.55], [0.1, 2.4, 0.35],
        ].map(([x, y, radius], index) => (
          <mesh key={index} position={[x, y, 0.03]}>
            <circleGeometry args={[radius, 20]} />
            <meshBasicMaterial color="#b7b6ab" transparent opacity={0.17} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </Billboard>
    </group>
  );
}

const PLAYER_LIGHT_LIMIT = 6;
const FLOCK_LIGHT_LIMIT = 3;

function NearbyLights({ anchors, player, goosePositions }: {
  anchors: CampusLightAnchor[];
  player: MutableRefObject<DoorInteraction>;
  goosePositions: MutableRefObject<Vector3[]>;
}) {
  const lights = useRef<(PointLight | null)[]>([]);
  const elapsed = useRef(1);
  useFrame(({ camera }, delta) => {
    elapsed.current += delta;
    if (elapsed.current < 0.15) return;
    elapsed.current = 0;
    const position = player.current.body?.translation() ?? camera.position;
    const selected = nearbyCampusLights(anchors, [position], PLAYER_LIGHT_LIMIT);
    if (goosePositions.current.length) {
      const available = anchors.filter((anchor) => !anchor.indoor && !selected.includes(anchor));
      selected.push(...nearbyCampusLights(available, goosePositions.current, FLOCK_LIGHT_LIMIT));
    }
    lights.current.forEach((light, index) => {
      if (!light) return;
      const anchor = selected[index];
      light.intensity = anchor?.intensity ?? 0;
      if (!anchor) return;
      light.position.copy(anchor.position);
      light.distance = anchor.distance;
      light.color.set(anchor.indoor ? "#ffe4ba" : "#ffd392");
    });
  });
  // Keep the number of light sources constant to avoid recompiling lighting shaders.
  return <>{Array.from({ length: PLAYER_LIGHT_LIMIT + FLOCK_LIGHT_LIMIT }, (_, index) => (
    <pointLight key={index} ref={(light) => { lights.current[index] = light; }} intensity={0} distance={15} decay={2} castShadow={false} />
  ))}</>;
}

export function CampusEnvironment({ time, campus, player, goosePositions }: {
  time: CampusTime;
  campus: CampusWorld;
  player: MutableRefObject<DoorInteraction>;
  goosePositions: MutableRefObject<Vector3[]>;
}) {
  const lighting = useRef<CampusLighting>();
  const [anchors, setAnchors] = useState<CampusLightAnchor[]>([]);
  const latestTime = useRef(time);
  latestTime.current = time;

  useEffect(() => {
    const binding = createCampusLighting([campus.object, ...campus.doors.map((door) => door.object)]);
    lighting.current = binding;
    binding.setTime(latestTime.current);
    setAnchors(binding.anchors);
    return () => {
      binding.dispose();
      lighting.current = undefined;
    };
  }, [campus]);

  useEffect(() => { lighting.current?.setTime(time); }, [time]);

  const night = time === "night";
  return (
    <>
      <color attach="background" args={[night ? "#080d1a" : "#c9e2f5"]} />
      <hemisphereLight args={[night ? "#7899d4" : "#e2f0fc", night ? "#111827" : "#a3b899", night ? 0.45 : 1.2]} />
      <directionalLight position={[75, 110, 55]} color={night ? "#b0caff" : "#fffaf0"} intensity={night ? 0.75 : 2.0} castShadow={false} />
      {!night && (
        <directionalLight position={[-60, 45, -45]} color="#bdd7ee" intensity={0.5} castShadow={false} />
      )}
      {night && <>
        <NightSky />
        <NearbyLights anchors={anchors} player={player} goosePositions={goosePositions} />
      </>}
    </>
  );
}

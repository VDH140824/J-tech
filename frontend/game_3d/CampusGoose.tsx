import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { Box3, CanvasTexture, CatmullRomCurve3, Group, Raycaster, SRGBColorSpace, Vector3, type Object3D } from "three";
import type { CampusWorld } from "./campusWorld";
import type { DoorInteraction } from "./CampusDoors";

export function getCampusGoosePlacement(campus: CampusWorld) {
  let lamp: Object3D | undefined;
  let garden: Object3D | undefined;
  campus.object.traverse((object) => {
    if (/^ALPHA_TOAD_GARDEN_Lamp[ _]pedestal$/.test(object.name)) lamp = object;
    if (/^ALPHA_TOAD_GARDEN_Garden[ _]foundation$/.test(object.name)) garden = object;
  });
  if (!lamp || !garden) return null;
  const position = new Box3().setFromObject(lamp).getCenter(new Vector3());
  // The monument faces +X. Stand on the sidewalk just outside its planting bed.
  position.x = new Box3().setFromObject(garden).max.x + 0.85;
  const ray = new Raycaster(new Vector3(position.x, 2, position.z), new Vector3(0, -1, 0), 0, 4);
  const ground = ray.intersectObject(campus.object, true).find((hit) => hit.point.y < 0.5);
  if (!ground) return null;
  position.y = ground.point.y + 0.012;
  return position;
}

export function createCampusGuideTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 640;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#fff8e8";
  context.fillRect(0, 0, 1024, 640);
  context.strokeStyle = "#b59a63";
  context.lineWidth = 8;
  context.strokeRect(16, 16, 992, 608);
  context.fillStyle = "#79633d";
  context.font = "700 28px system-ui, sans-serif";
  context.fillText("TRÙM TRƯỜNG NHẮC BẠN", 64, 80);
  context.fillStyle = "#294841";
  context.font = "800 50px system-ui, sans-serif";
  context.fillText("Lượt khấn Cóc Tiến Sĩ", 64, 155);
  context.font = "34px system-ui, sans-serif";
  context.fillText("Vào phòng, ngồi tại máy tính", 64, 230);
  context.fillText("và làm bài kiểm tra.", 64, 280);
  context.fillStyle = "#e3eee2";
  context.fillRect(56, 316, 912, 84);
  context.fillStyle = "#315942";
  context.font = "800 35px system-ui, sans-serif";
  context.fillText("ĐÚNG TỪ 50% → +1 LƯỢT KHẤN", 78, 370);
  context.font = "32px system-ui, sans-serif";
  context.fillText("Đến bàn cạnh Trùm trường,", 64, 464);
  context.fillText("dùng 1 lượt để rút 1 quẻ may mắn.", 64, 513);
  context.fillStyle = "#79633d";
  context.font = "26px system-ui, sans-serif";
  context.fillText("Cốc rung 4 giây rồi thẻ quẻ sẽ rơi ra.", 64, 578);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function GooseModel() {
  const head = useRef<Group>(null);
  const neck = useMemo(() => new CatmullRomCurve3([
    new Vector3(0, 0.53, 0.22), new Vector3(0, 0.78, 0.27),
    new Vector3(0, 1.02, 0.18), new Vector3(0, 1.23, 0.28), new Vector3(0, 1.29, 0.4),
  ]), []);
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.07;
  });
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.49, -0.02]} scale={[0.31, 0.32, 0.5]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#eeeae0" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.65, -0.42]} rotation={[-0.65, 0, 0]} scale={[0.19, 0.1, 0.26]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#f8f5ed" roughness={0.9} flatShading />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.255, 0.55, -0.08]} rotation={[0.16, side * 0.18, side * 0.15]} scale={[0.095, 0.23, 0.39]}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color="#a3a29a" roughness={0.95} flatShading />
          </mesh>
          {[0, 1, 2].map((feather) => (
            <mesh key={feather} position={[side * (0.29 + feather * 0.005), 0.46 + feather * 0.07, -0.17]} rotation={[0.18, 0, side * -0.12]} scale={[0.045, 0.042, 0.24]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={feather === 1 ? "#c4c1b6" : "#b6b4aa"} roughness={1} flatShading />
            </mesh>
          ))}
          <mesh position={[side * 0.13, 0.16, 0.01]}>
            <cylinderGeometry args={[0.026, 0.034, 0.25, 8]} />
            <meshStandardMaterial color="#dc8735" roughness={0.9} />
          </mesh>
          <mesh position={[side * 0.13, 0.035, 0.09]} scale={[0.095, 0.035, 0.155]}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshStandardMaterial color="#e69b45" roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
      <mesh>
        <tubeGeometry args={[neck, 20, 0.083, 8, false]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
      </mesh>
      <group ref={head} position={[0, 1.29, 0.4]}>
        <mesh scale={[0.12, 0.135, 0.16]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.015, 0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.5]}>
          <coneGeometry args={[0.084, 0.24, 4]} />
          <meshStandardMaterial color="#e8a14b" roughness={0.85} flatShading />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.108, 0.025, 0.05]}>
            <sphereGeometry args={[0.021, 8, 6]} />
            <meshStandardMaterial color="#242725" roughness={0.5} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function CampusGoose({ campus, player }: { campus: CampusWorld; player: MutableRefObject<DoorInteraction> }) {
  const position = useMemo(() => getCampusGoosePlacement(campus), [campus]);
  const guideTexture = useMemo(createCampusGuideTexture, []);
  useEffect(() => () => { guideTexture?.dispose(); }, [guideTexture]);
  const { world, rapier } = useRapier();
  const [showLabels, setShowLabels] = useState(false);
  const visible = useRef(false);
  const tick = useRef(0);
  const origin = useMemo(() => new Vector3(), []);
  const target = useMemo(() => new Vector3(), []);
  useFrame(() => {
    if (++tick.current % 6 !== 0 || !position) return;
    const body = player.current.body;
    let nearby = false;
    if (body) {
      const translation = body.translation();
      origin.set(translation.x, translation.y + 0.6, translation.z);
      target.copy(position);
      target.y += 1.65;
      target.sub(origin);
      const distance = target.length();
      nearby = distance < 14 && Math.abs(translation.y - position.y) < 2.5
        && !world.castRay(new rapier.Ray(origin, target.normalize()), Math.max(0, distance - 0.15), true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, player.current.collider ?? undefined, body);
    }
    if (visible.current !== nearby) { visible.current = nearby; setShowLabels(nearby); }
  });
  if (!position) return null;
  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <CuboidCollider args={[0.52, 0.68, 0.31]} position={[0, 0.68, 0]} />
      <GooseModel />
      {showLabels && <Html position={[0, 1.7, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="campus-goose-name">Trùm trường<small>Người gác Cóc Tiến Sĩ</small></div>
      </Html>}
      <CuboidCollider args={[0.06, 0.91, 0.86]} position={[0, 0.91, 1.65]} />
      <group position={[0, 0, 1.65]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.075, 1, 0.075]} />
          <meshStandardMaterial color="#69513a" roughness={0.95} />
        </mesh>
        <mesh position={[0, 1.25, 0]}>
          <boxGeometry args={[1.72, 1.12, 0.09]} />
          <meshStandardMaterial color="#274a48" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.25, 0.05]}>
          <planeGeometry args={[1.62, 1.02]} />
          <meshBasicMaterial map={guideTexture} color={guideTexture ? "white" : "#fff8e8"} toneMapped={false} depthTest depthWrite />
        </mesh>
      </group>
    </RigidBody>
  );
}

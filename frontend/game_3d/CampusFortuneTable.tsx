import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, useRapier } from "@react-three/rapier";
import { CanvasTexture, DoubleSide, Group, MathUtils, Raycaster, SRGBColorSpace, Vector3 } from "three";
import { getCampusGoosePlacement } from "./CampusGoose";
import { pickCampusFortune, type CampusFortune } from "./campusFortunes";
import { PLAYER_HALF_HEIGHT, type CampusWorld } from "./campusWorld";
import type { DoorInteraction } from "./CampusDoors";
import type { SeatingControl } from "./campusSeating";

export interface FortuneInteraction { request: number }
export interface FortuneStatus {
  nearby: boolean;
  phase: "idle" | "shaking" | "falling" | "ready";
  fortune: CampusFortune | null;
  drawId: number;
  message: string;
}

export const EMPTY_FORTUNE_STATUS: FortuneStatus = { nearby: false, phase: "idle", fortune: null, drawId: 0, message: "" };
export const FORTUNE_SHAKE_SECONDS = 4;
export const FORTUNE_FALL_SECONDS = 0.9;

export function getCampusFortuneTablePlacement(campus: CampusWorld) {
  const goose = getCampusGoosePlacement(campus);
  if (!goose) return null;
  const table = goose.clone().add(new Vector3(0.05, 0, -1.7));
  const ground = new Raycaster(new Vector3(table.x, 2, table.z), new Vector3(0, -1, 0), 0, 4)
    .intersectObject(campus.object, true).find((hit) => hit.point.y < 0.5);
  if (!ground) return null;
  table.y = ground.point.y + 0.012;
  return { goose, table };
}

export function createCampusFortuneTexture(fortune: CampusFortune) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#fff8e4";
  context.fillRect(0, 0, 512, 768);
  context.strokeStyle = "#b37b37";
  context.lineWidth = 5;
  context.strokeRect(18, 18, 476, 732);
  context.textAlign = "center";
  context.fillStyle = "#953b35";
  context.font = "800 26px system-ui, sans-serif";
  context.fillText("CÓC TIẾN SĨ", 256, 78);
  context.font = "700 24px system-ui, sans-serif";
  context.fillText(`QUẺ SỐ ${String(fortune.id).padStart(2, "0")}`, 256, 124);
  let y = 193;
  const paragraph = (text: string, font: string, lineHeight: number) => {
    context.font = font;
    let line = "";
    for (const word of text.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && context.measureText(candidate).width > 412) {
        context.fillText(line, 256, y);
        y += lineHeight;
        line = word;
      } else line = candidate;
    }
    if (line) { context.fillText(line, 256, y); y += lineHeight; }
  };
  paragraph(fortune.title, "800 33px system-ui, sans-serif", 43);
  y += 24;
  context.fillStyle = "#3b4941";
  paragraph(fortune.content, "28px system-ui, sans-serif", 42);
  context.fillStyle = "#953b35";
  context.font = "700 23px system-ui, sans-serif";
  context.fillText("Trùm trường gửi bạn", 256, 708);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

function FortuneCard({ fortune }: { fortune: CampusFortune }) {
  const texture = useMemo(() => createCampusFortuneTexture(fortune), [fortune]);
  useEffect(() => () => { texture?.dispose(); }, [texture]);
  return (
    <group>
      <mesh position={[0, 0, -0.006]}>
        <boxGeometry args={[0.42, 0.63, 0.012]} />
        <meshStandardMaterial color="#d5b887" roughness={0.95} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.42, 0.63]} />
        <meshBasicMaterial map={texture} color={texture ? "white" : "#fff8e4"} side={DoubleSide} toneMapped={false} depthTest depthWrite />
      </mesh>
    </group>
  );
}

export function CampusFortuneTable({ campus, player, seating, interaction, spendPrayer, onStatus }: {
  campus: CampusWorld;
  player: MutableRefObject<DoorInteraction>;
  seating: MutableRefObject<SeatingControl>;
  interaction: MutableRefObject<FortuneInteraction>;
  spendPrayer: () => boolean;
  onStatus: (status: FortuneStatus) => void;
}) {
  const placement = useMemo(() => getCampusFortuneTablePlacement(campus), [campus]);
  const { world, rapier } = useRapier();
  const cup = useRef<Group>(null);
  const card = useRef<Group>(null);
  const [cardFortune, setCardFortune] = useState<CampusFortune | null>(null);
  const state = useRef({ ...EMPTY_FORTUNE_STATUS, lastRequest: interaction.current.request, startedAt: 0, pending: null as CampusFortune | null, report: "", tick: 0 });
  const origin = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);

  const isNearby = () => {
    const body = player.current.body;
    if (!placement || !body || seating.current.active) return false;
    const position = body.translation();
    if (Math.abs(position.y - PLAYER_HALF_HEIGHT - placement.table.y) > 0.65) return false;
    const gooseDistance = Math.hypot(position.x - placement.goose.x, position.z - placement.goose.z);
    const tableDistance = Math.hypot(position.x - placement.table.x, position.z - placement.table.z);
    if (gooseDistance > 2.7 && tableDistance > 2.2) return false;
    origin.set(position.x, position.y + 0.6, position.z);
    direction.set(placement.table.x, placement.table.y + 1.35, placement.table.z - 0.2).sub(origin);
    const length = direction.length();
    return length < 0.1 || !world.castRay(new rapier.Ray(origin, direction.normalize()), length - 0.08, true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, player.current.collider ?? undefined, body);
  };

  useFrame(({ clock }) => {
    if (!placement) return;
    const current = state.current;
    const requested = current.lastRequest !== interaction.current.request;
    current.lastRequest = interaction.current.request;
    if (++current.tick % 6 === 0 || requested) current.nearby = isNearby();
    if (requested && current.phase !== "shaking" && current.phase !== "falling") {
      if (!current.nearby) current.message = "Hãy đến gần Trùm trường hoặc bàn rút thăm.";
      else if (!spendPrayer()) current.message = "Bạn cần 1 lượt khấn. Làm bài kiểm tra đạt từ 50% để nhận lượt nhé.";
      else {
        current.phase = "shaking";
        current.startedAt = clock.elapsedTime;
        current.drawId = interaction.current.request;
        current.fortune = null;
        current.message = "";
        current.pending = pickCampusFortune();
        setCardFortune(current.pending);
        if (card.current) card.current.visible = false;
      }
    }
    const elapsed = Math.max(0, clock.elapsedTime - current.startedAt);
    if (cup.current) {
      const shaking = current.phase === "shaking" && elapsed < FORTUNE_SHAKE_SECONDS;
      cup.current.position.set(shaking ? Math.sin(elapsed * 39) * 0.025 : 0, 0.9 + (shaking ? Math.abs(Math.sin(elapsed * 32)) * 0.014 : 0), -0.2);
      cup.current.rotation.set(shaking ? Math.sin(elapsed * 31) * 0.085 : 0, 0, shaking ? Math.sin(elapsed * 37) * 0.13 : 0);
    }
    if (current.phase === "shaking" && elapsed >= FORTUNE_SHAKE_SECONDS) current.phase = "falling";
    if (current.phase === "falling") {
      const progress = MathUtils.clamp((elapsed - FORTUNE_SHAKE_SECONDS) / FORTUNE_FALL_SECONDS, 0, 1);
      if (card.current) {
        card.current.visible = true;
        card.current.position.set(MathUtils.lerp(0, 0.17, progress), MathUtils.lerp(1.56, 0.914, progress) + Math.sin(progress * Math.PI) * 0.35, MathUtils.lerp(-0.2, 0.28, progress));
        card.current.rotation.set(MathUtils.lerp(-0.35, -Math.PI / 2, progress), 0, Math.PI / 2 + (1 - progress) * Math.PI * 2);
      }
      if (progress === 1) { current.phase = "ready"; current.fortune = current.pending; }
    }
    const report = `${current.nearby}|${current.phase}|${current.drawId}|${current.fortune?.id}|${current.message}`;
    if (report !== current.report) {
      current.report = report;
      onStatus({ nearby: current.nearby, phase: current.phase, fortune: current.fortune, drawId: current.drawId, message: current.message });
    }
  });

  if (!placement) return null;
  return (
    <RigidBody type="fixed" colliders={false} position={placement.table}>
      <CuboidCollider args={[0.58, 0.45, 0.7]} position={[0, 0.45, 0]} />
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.16, 0.1, 1.4]} />
        <meshStandardMaterial color="#8f5937" roughness={0.9} />
      </mesh>
      {[-1, 1].flatMap((x) => [-1, 1].map((z) => (
        <mesh key={`${x}:${z}`} position={[x * 0.45, 0.4, z * 0.57]}>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#65442f" roughness={0.95} />
        </mesh>
      )))}
      <group ref={cup} position={[0, 0.9, -0.2]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.19, 0.15, 0.36, 24, 1, true]} />
          <meshStandardMaterial color="#9d3f32" roughness={0.8} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.015, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.03, 24]} />
          <meshStandardMaterial color="#6b3327" roughness={0.9} />
        </mesh>
        {[0.06, 0.32, 0.36].map((height) => (
          <mesh key={height} position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[height < 0.1 ? 0.16 : 0.187, 0.012, 6, 24]} />
            <meshStandardMaterial color="#d9b364" roughness={0.7} />
          </mesh>
        ))}
        {Array.from({ length: 9 }, (_, index) => {
          const angle = index * Math.PI * 2 / 9;
          return <group key={index} position={[Math.cos(angle) * 0.105, 0.33 + index % 3 * 0.025, Math.sin(angle) * 0.105]} rotation={[Math.sin(angle) * 0.09, 0, -Math.cos(angle) * 0.09]}>
            <mesh><boxGeometry args={[0.024, 0.53, 0.024]} /><meshStandardMaterial color="#e6c58a" roughness={0.9} /></mesh>
            <mesh position={[0, 0.23, 0]}><boxGeometry args={[0.027, 0.08, 0.027]} /><meshStandardMaterial color="#a83232" roughness={0.9} /></mesh>
          </group>;
        })}
      </group>
      <group ref={card} visible={false}>
        {cardFortune && <FortuneCard fortune={cardFortune} />}
      </group>
    </RigidBody>
  );
}

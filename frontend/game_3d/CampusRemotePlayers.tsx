import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MathUtils, Vector3 } from "three";
import { CampusAvatar, type AvatarMotion } from "./CampusAvatar";
import { PLAYER_HALF_HEIGHT } from "./campusWorld";
import type { CampusNetwork } from "./campusMultiplayer";

function RemotePlayer({ id, network }: { id: number; network: MutableRefObject<CampusNetwork> }) {
  const group = useRef<Group>(null);
  const motion = useRef<AvatarMotion>({ speed: 0, running: false });
  const target = useRef(new Vector3());
  const ready = useRef(false);
  const lastUpdate = useRef(0);
  const peer = network.current.peers.get(id);
  useFrame((_, delta) => {
    const current = network.current.peers.get(id);
    if (!group.current || !current) return;
    const state = current.state;
    target.current.set(state.x, state.y - PLAYER_HALF_HEIGHT, state.z);
    if (!ready.current || (state.teleport && lastUpdate.current !== current.updatedAt) || group.current.position.distanceToSquared(target.current) > 64) {
      group.current.position.copy(target.current); group.current.rotation.y = state.yaw; ready.current = true;
    } else {
      const blend = 1 - Math.exp(-14 * Math.min(delta, 0.1));
      group.current.position.lerp(target.current, blend);
      const turn = MathUtils.euclideanModulo(state.yaw - group.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      group.current.rotation.y += turn * blend;
    }
    lastUpdate.current = current.updatedAt;
    const fresh = performance.now() - (current.receivedAt ?? 0) < 700;
    motion.current = { speed: fresh ? state.speed : 0, running: fresh && state.running, seated: !!state.seatId,
      gesture: fresh ? state.gesture ?? undefined : undefined };
  });
  return <group ref={group}><CampusAvatar character={peer?.character ?? "male"} name={peer?.name ?? "Học viên"} motion={motion} /></group>;
}

export function CampusRemotePlayers({ roster, network }: { roster: number[]; network: MutableRefObject<CampusNetwork> }) {
  return <>{roster.map((id) => <RemotePlayer key={id} id={id} network={network} />)}</>;
}

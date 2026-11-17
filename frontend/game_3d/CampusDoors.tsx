import { useMemo, useRef, type MutableRefObject } from "react";
import { CuboidCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { Quaternion, Vector3 } from "three";
import { doorOpeningAngle, doorSweepBlocked, nearbyCampusDoor, type CampusDoor } from "./campusWorld";
import type { CampusNetwork } from "./campusMultiplayer";

export interface DoorInteraction {
  body: RapierRigidBody | null;
  collider: RapierCollider | null;
  request: number;
}

export interface DoorPrompt {
  id: string;
  label: string;
  action: "Mở cửa" | "Đóng cửa" | "Đang mở cửa…" | "Đang đóng cửa…";
  disabled: boolean;
  blocked: boolean;
}

interface DoorState {
  door: CampusDoor;
  body: RapierRigidBody | null;
  angle: number;
  target: number;
  opening: boolean;
  blocked: boolean;
  rotation: Quaternion;
}

export function CampusDoors({ doors, interaction, onPrompt, network }: {
  doors: CampusDoor[];
  interaction: MutableRefObject<DoorInteraction>;
  onPrompt: (prompt: DoorPrompt | null) => void;
  network?: MutableRefObject<CampusNetwork>;
}) {
  const { world, rapier } = useRapier();
  const states = useMemo<DoorState[]>(() => doors.map((door) => ({
    door, body: null, angle: 0, target: 0, opening: false, blocked: false, rotation: new Quaternion(),
  })), [doors]);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  const target = useMemo(() => new Vector3(), []);
  const direction = useMemo(() => new Vector3(), []);
  const consumed = useRef(interaction.current.request);
  const tick = useRef(0);
  const previousPrompt = useRef("");

  useBeforePhysicsStep(() => {
    const playerBody = interaction.current.body;
    const playerCollider = interaction.current.collider;
    if (!playerBody || !playerCollider) return;
    const player = playerBody.translation();
    const nextPlayer = playerBody.nextTranslation();
    const net = network?.current;
    const peerBlocked = (door: CampusDoor, from: number, to: number) => net?.connected
      && [...net.peers.values()].some((peer) => doorSweepBlocked(door, from, to, peer.state));
    const requested = consumed.current !== interaction.current.request;
    consumed.current = interaction.current.request;

    for (const state of states) {
      if (net?.connected) {
        state.target = net.doors[state.door.id] ?? 0;
        state.opening = Math.abs(state.target) > 0.1;
      }
      if (!state.body || Math.abs(state.target - state.angle) < 0.0001) continue;
      const step = Math.min(Math.abs(state.target - state.angle), world.timestep * 2.2);
      const next = state.angle + Math.sign(state.target - state.angle) * step;
      state.blocked = doorSweepBlocked(state.door, state.angle, next, player)
        || doorSweepBlocked(state.door, state.angle, next, nextPlayer) || !!peerBlocked(state.door, state.angle, next);
      if (state.blocked) continue;
      state.angle = next;
      state.rotation.setFromAxisAngle(up, next);
      state.body.setNextKinematicRotation(state.rotation);
    }

    // Refresh the prompt at 10 Hz, but always recheck proximity on interaction.
    if (++tick.current % 6 !== 0 && !requested) return;
    const nearby = nearbyCampusDoor(doors, player, (door) => {
      target.copy(door.center).add(door.hinge);
      target.y = player.y;
      direction.copy(target).sub(player);
      const distance = direction.length();
      if (distance < 0.08) return true;
      direction.divideScalar(distance);
      const obstruction = world.castRay(
        new rapier.Ray(player, direction), distance - 0.08, true,
        rapier.QueryFilterFlags.EXCLUDE_SENSORS | rapier.QueryFilterFlags.EXCLUDE_KINEMATIC | rapier.QueryFilterFlags.EXCLUDE_DYNAMIC,
      );
      return !obstruction;
    });
    const state = nearby && states.find((entry) => entry.door.id === nearby.id);
    let prompt: DoorPrompt | null = null;
    if (state) {
      let moving = Math.abs(state.target - state.angle) > 0.0001;
      let pending = !!net?.pendingDoors.has(state.door.id);
      const closingBlocked = state.opening && (
        doorSweepBlocked(state.door, state.angle, 0, player)
        || doorSweepBlocked(state.door, state.angle, 0, nextPlayer) || !!peerBlocked(state.door, state.angle, 0)
      );
      if (requested && !moving && !closingBlocked && !pending) {
        if (net?.connected) pending = net.door(state.door.id, state.opening ? 0 : doorOpeningAngle(state.door, player));
        else {
          state.opening = !state.opening;
          state.target = state.opening ? doorOpeningAngle(state.door, player) : 0;
          state.blocked = false;
          moving = true;
        }
      }
      prompt = {
        id: state.door.id, label: state.door.label,
        action: pending ? (state.opening ? "Đang đóng cửa…" : "Đang mở cửa…") : moving ? (state.opening ? "Đang mở cửa…" : "Đang đóng cửa…") : (state.opening ? "Đóng cửa" : "Mở cửa"),
        disabled: moving || !!closingBlocked || pending,
        blocked: moving ? state.blocked : closingBlocked,
      };
    }
    const signature = JSON.stringify(prompt);
    if (signature !== previousPrompt.current) {
      previousPrompt.current = signature;
      onPrompt(prompt);
    }
  });

  return <>{states.map((state) => (
    <RigidBody
      key={state.door.id}
      ref={(body) => { state.body = body; }}
      type="kinematicPosition"
      colliders={false}
      position={state.door.hinge.toArray()}
    >
      <primitive object={state.door.object} dispose={null} />
      <CuboidCollider args={state.door.halfExtents.toArray()} position={state.door.center.toArray()} />
    </RigidBody>
  ))}</>;
}

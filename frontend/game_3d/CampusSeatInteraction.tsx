import { useRef, type MutableRefObject } from "react";
import { useAfterPhysicsStep, useRapier } from "@react-three/rapier";
import { Vector3 } from "three";
import type { DoorInteraction } from "./CampusDoors";
import { PLAYER_HALF_HEIGHT } from "./campusWorld";
import { nearbyCampusSeat, type CampusSeat, type SeatingControl } from "./campusSeating";
import type { CampusNetwork } from "./campusMultiplayer";

export function CampusSeatInteraction({ seats, player, control, onNearby, network }: {
  seats: CampusSeat[];
  player: MutableRefObject<DoorInteraction>;
  control: MutableRefObject<SeatingControl>;
  onNearby: (seat: CampusSeat | null) => void;
  network?: MutableRefObject<CampusNetwork>;
}) {
  const { world, rapier } = useRapier();
  const tick = useRef(0);
  const previous = useRef<string | null>(null);
  const origin = useRef(new Vector3());
  const direction = useRef(new Vector3());
  useAfterPhysicsStep(() => {
    if (++tick.current % 6 !== 0) return;
    const body = player.current.body;
    const collider = player.current.collider;
    let nearby: CampusSeat | null = null;
    if (body && collider && !control.current.active) {
      const position = body.translation();
      origin.current.set(position.x, position.y + 0.6, position.z);
      nearby = nearbyCampusSeat(seats, position, PLAYER_HALF_HEIGHT, (seat) => {
        const net = network?.current;
        if (net?.connected && net.seats[seat.id] !== undefined && net.seats[seat.id] !== net.selfId) return false;
        direction.current.copy(seat.eye).sub(origin.current);
        const length = direction.current.length();
        return length < 0.1 || !world.castRay(
          new rapier.Ray(origin.current, direction.current.normalize()), length - 0.08, true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider, body,
        );
      }) ?? null;
    }
    control.current.nearby = nearby;
    if ((nearby?.id ?? null) !== previous.current) {
      previous.current = nearby?.id ?? null;
      onNearby(nearby);
    }
  });
  return null;
}

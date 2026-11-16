import { useMemo, useRef, type MutableRefObject } from "react";
import { useAfterPhysicsStep, useRapier } from "@react-three/rapier";
import { Box3, Raycaster, Vector3, type Object3D } from "three";
import type * as Rapier from "@dimforge/rapier3d-compat";
import { CHARACTER_OFFSET, PLAYER_HALF_HEIGHT, PLAYER_RADIUS, type CampusWorld } from "./campusWorld";
import type { DoorInteraction } from "./CampusDoors";
import type { SeatingControl } from "./campusSeating";

export type ToadAction = "touch" | "pray";
export interface ToadSite {
  center: Vector3;
  contact: Vector3;
  stand: Vector3;
  floorY: number;
}
export interface ToadInteraction {
  request: number;
  cancel: number;
  action: ToadAction;
  activeAction: ToadAction | null;
  phase: "idle" | "approaching" | "gesturing";
  message: string;
}
export interface ToadStatus {
  nearby: boolean;
  phase: ToadInteraction["phase"];
  action: ToadAction | null;
  message: string;
}
export const EMPTY_TOAD_STATUS: ToadStatus = { nearby: false, phase: "idle", action: null, message: "" };
export const TOAD_GESTURE_SECONDS: Record<ToadAction, number> = { touch: 2.2, pray: 2.8 };

export function getCampusToadSite(campus: CampusWorld): ToadSite | null {
  let coat: Object3D | undefined;
  let head: Object3D | undefined;
  let pedestal: Object3D | undefined;
  const statue: Object3D[] = [];
  campus.object.traverse((object) => {
    if (object.name.startsWith("ALPHA_MONUMENT_")) statue.push(object);
    if (/^ALPHA_MONUMENT_Graduation[ _]coat$/.test(object.name)) coat = object;
    if (/^ALPHA_MONUMENT_Wide[ _]frog[ _]head$/.test(object.name)) head = object;
    if (/^ALPHA_MONUMENT_Pedestal[ _]top$/.test(object.name)) pedestal = object;
  });
  if (!coat || !head || !pedestal) return null;
  const coatBounds = new Box3().setFromObject(coat);
  const headBounds = new Box3().setFromObject(head);
  const floorY = new Box3().setFromObject(pedestal).max.y;
  const center = coatBounds.getCenter(new Vector3());
  // The statue faces +X; the right hand reaches its coat from the front ledge.
  const stand = new Vector3(Math.max(coatBounds.max.x, headBounds.max.x) + PLAYER_RADIUS + CHARACTER_OFFSET + 0.025,
    floorY + PLAYER_HALF_HEIGHT + 0.035, center.z);
  const origin = new Vector3(stand.x + 1, floorY + 1.15, center.z + 0.3);
  const hit = new Raycaster(origin, new Vector3(-1, 0, 0), 0, 4).intersectObjects(statue, true)[0];
  if (!hit) return null;
  const contact = hit.point.clone();
  contact.x += 0.01;
  return { center, contact, stand, floorY };
}

export function canInteractWithToad(
  rapier: Pick<typeof Rapier, "Ray" | "QueryFilterFlags">,
  world: Rapier.World,
  site: ToadSite | null,
  position: { x: number; y: number; z: number },
  collider?: Rapier.Collider,
  body?: Rapier.RigidBody,
) {
  if (!site || position.x < site.stand.x - 0.2
    || Math.abs(position.y - PLAYER_HALF_HEIGHT - site.floorY) > 1
    || Math.hypot(position.x - site.stand.x, position.z - site.stand.z) > 2.6) return false;
  const origin = new Vector3(position.x, position.y + 0.6, position.z);
  const direction = site.contact.clone().sub(origin);
  const length = direction.length();
  return length < 0.1 || !world.castRay(new rapier.Ray(origin, direction.normalize()), length - 0.08, true,
    rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider, body);
}

export function CampusToadInteraction({ site, player, seating, interaction, onStatus }: {
  site: ToadSite | null;
  player: MutableRefObject<DoorInteraction>;
  seating: MutableRefObject<SeatingControl>;
  interaction: MutableRefObject<ToadInteraction>;
  onStatus: (status: ToadStatus) => void;
}) {
  const { world, rapier } = useRapier();
  const tick = useRef(0);
  const previous = useRef("");
  const nearby = useRef(false);
  const position = useMemo(() => new Vector3(), []);
  useAfterPhysicsStep(() => {
    const current = interaction.current;
    if (++tick.current % 6 === 0 || current.phase !== "idle") {
      const body = player.current.body;
      if (body) position.copy(body.translation());
      nearby.current = !!body && !seating.current.active
        && canInteractWithToad(rapier, world, site, position, player.current.collider ?? undefined, body ?? undefined);
    }
    const report = `${nearby.current}|${current.phase}|${current.activeAction}|${current.message}`;
    if (report !== previous.current) {
      previous.current = report;
      onStatus({ nearby: nearby.current, phase: current.phase, action: current.activeAction, message: current.message });
    }
  });
  return null;
}

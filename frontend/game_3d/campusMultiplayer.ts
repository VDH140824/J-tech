import type { AvatarMotion } from "./CampusAvatar";

export const CAMPUS_MAP_ID = "e29aac358137686a12e9777652c293602812783eb6535ed75a370734e53fda32";
export interface CampusPose {
  x: number; y: number; z: number; yaw: number; speed: number; running: boolean;
  seatId: string | null;
  gesture: AvatarMotion["gesture"] | null;
  teleport?: boolean;
}
export interface CampusPeer { id: number; name: string; state: CampusPose; updatedAt: number; receivedAt?: number }
export interface CampusMessage { id: number; clientId: string; userId: number; name: string; text: string; time: number }
export type CampusConnectionStatus = "connecting" | "online" | "reconnecting" | "offline" | "full" | "replaced" | "unauthorized" | "map-mismatch";
export interface SeatReply { requestId: string; seatId: string | null; granted: boolean; message: string }
export interface CampusNetwork {
  connected: boolean;
  selfId: number | null;
  peers: Map<number, CampusPeer>;
  doors: Record<string, number>;
  seats: Record<string, number>;
  ownSeatId: string | null;
  spawn: { x: number; y: number; z: number } | null;
  seatReply: SeatReply | null;
  pendingDoors: Map<string, number>;
  publish: (state: CampusPose) => void;
  door: (id: string, angle: number) => boolean;
  reserveSeat: (id: string) => string | null;
  releaseSeat: () => void;
}
export function emptyCampusNetwork(): CampusNetwork {
  return { connected: false, selfId: null, peers: new Map(), doors: {}, seats: {}, ownSeatId: null, spawn: null, seatReply: null, pendingDoors: new Map(),
    publish: () => {}, door: () => false, reserveSeat: () => null, releaseSeat: () => {} };
}
export function isCampusPose(value: unknown): value is CampusPose {
  if (!value || typeof value !== "object") return false;
  const pose = value as CampusPose;
  return [pose.x, pose.y, pose.z, pose.yaw, pose.speed].every(Number.isFinite)
    && typeof pose.running === "boolean" && (pose.seatId === null || typeof pose.seatId === "string")
    && (!pose.gesture || ((pose.gesture.action === "touch" || pose.gesture.action === "pray") && Number.isFinite(pose.gesture.progress)));
}

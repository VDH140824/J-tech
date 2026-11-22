import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CapsuleCollider, RigidBody, useBeforePhysicsStep, useRapier, type RapierCollider, type RapierRigidBody } from "@react-three/rapier";
import { Group, MathUtils, Vector3 } from "three";
import { CampusAvatar, type AvatarMotion, type CampusCharacter } from "./CampusAvatar";
import type { CharacterCustomization } from "./campusCharacterStyles";
import type { DoorInteraction } from "./CampusDoors";
import { findSeatStandingPosition, type CampusSeat, type SeatingControl } from "./campusSeating";
import { canInteractWithToad, TOAD_GESTURE_SECONDS, type ToadInteraction, type ToadSite } from "./CampusToadInteraction";
import type { CampusNetwork } from "./campusMultiplayer";
import {
  CHARACTER_OFFSET, PLAYER_HALF_HEIGHT, PLAYER_HALF_SEGMENT, PLAYER_RADIUS,
  RUN_SPEED, WALK_SPEED, findCampusSpawn, isOutsideCampus, type CampusWorld,
} from "./campusWorld";

export interface CampusInput {
  buttons: Set<string>;
  blocked?: boolean;
}

interface CampusPlayerProps {
  campus: CampusWorld;
  name: string;
  character: CampusCharacter;
  customization?: CharacterCustomization;
  resetVersion: number;
  input: MutableRefObject<CampusInput>;
  onControlFocus: (active: boolean) => void;
  doorInteraction: MutableRefObject<DoorInteraction>;
  seating: MutableRefObject<SeatingControl>;
  onSeatedChange: (seat: CampusSeat | null, message?: string) => void;
  toadSite: ToadSite | null;
  toadInteraction: MutableRefObject<ToadInteraction>;
  network?: MutableRefObject<CampusNetwork>;
}

const MOVEMENT_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight", "ShiftLeft", "ShiftRight"]);

export function CampusPlayer({ campus, name, character, customization, resetVersion, input, onControlFocus, doorInteraction, seating, onSeatedChange, toadSite, toadInteraction, network }: CampusPlayerProps) {
  const body = useRef<RapierRigidBody>(null);
  const collider = useRef<RapierCollider>(null);
  const visual = useRef<Group>(null);
  const { camera, gl } = useThree();
  const { world, rapier } = useRapier();
  const controller = useRef<ReturnType<typeof world.createCharacterController>>();
  const keys = useRef(new Set<string>());
  const motion = useRef<AvatarMotion>({ speed: 0, running: false });
  const movement = useRef({ x: 0, z: 0, vertical: 0, heading: Math.PI });
  const orbit = useRef({ yaw: 0, pitch: 1.12, distance: 5.5 });
  const needsReset = useRef(true);
  const spawn = useRef<Vector3>();
  const networkSpawn = useRef<string | null>(null);
  const savedStand = useRef<Vector3>();
  const seatRequests = useRef({ sit: 0, exit: 0 });
  const cameraReady = useRef(false);
  const toadState = useRef({ request: toadInteraction.current.request, cancel: toadInteraction.current.cancel, elapsed: 0, approachTime: 0, stalled: 0, distance: Infinity, aligned: false });
  const cameraTarget = useMemo(() => new Vector3(), []);
  const cameraDirection = useMemo(() => new Vector3(), []);
  const desiredCamera = useMemo(() => new Vector3(), []);
  const smoothTarget = useMemo(() => new Vector3(), []);
  const cameraShape = useMemo(() => new rapier.Ball(0.16), [rapier]);
  const initialPosition = useMemo<[number, number, number]>(() => [0, campus.bounds.max.y + 5, 0], [campus]);

  useEffect(() => {
    const character = world.createCharacterController(CHARACTER_OFFSET);
    character.enableAutostep(0.34, 0.12, false);
    character.enableSnapToGround(0.3);
    character.setMaxSlopeClimbAngle(Math.PI * 0.27);
    character.setMinSlopeSlideAngle(Math.PI * 0.29);
    controller.current = character;
    needsReset.current = true;
    return () => {
      controller.current = undefined;
      world.removeCharacterController(character);
      toadInteraction.current.phase = "idle";
      toadInteraction.current.activeAction = null;
    };
  }, [world, toadInteraction]);

  useEffect(() => {
    needsReset.current = true;
    keys.current.clear();
    input.current.buttons.clear();
  }, [resetVersion, input]);

  useEffect(() => {
    if (!collider.current || !body.current) return;
    spawn.current = findCampusSpawn(rapier, world, campus, collider.current, body.current);
    needsReset.current = true;
  }, [campus, rapier, world]);

  useEffect(() => {
    const playerBody = body.current;
    doorInteraction.current.body = playerBody;
    doorInteraction.current.collider = collider.current;
    return () => {
      if (doorInteraction.current.body === playerBody) {
        doorInteraction.current.body = null;
        doorInteraction.current.collider = null;
      }
    };
  }, [doorInteraction, world]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute("aria-label", "WASD hoặc phím mũi tên để di chuyển; E để mở hoặc đóng cửa; kéo chuột để xoay camera");
    const pointers = new Map<number, { x: number; y: number }>();
    const clear = () => {
      keys.current.clear();
      input.current.buttons.clear();
      pointers.clear();
      onControlFocus(false);
    };
    const focus = () => onControlFocus(true);
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (input.current.blocked || (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]"))) return;
      if (event.code === "Escape" && toadInteraction.current.phase !== "idle") {
        event.preventDefault();
        if (!event.repeat) toadInteraction.current.cancel++;
        return;
      }
      if (seating.current.active) {
        if (event.code === "Escape" && !seating.current.screenExpanded && !document.fullscreenElement) {
          event.preventDefault();
          if (!event.repeat) seating.current.exitRequest++;
        }
        return;
      }
      if (document.activeElement === canvas && event.code === "KeyF") {
        event.preventDefault();
        if (!event.repeat) seating.current.sitRequest++;
        return;
      }
      if (document.activeElement === canvas && event.code === "KeyE") {
        event.preventDefault();
        if (!event.repeat) doorInteraction.current.request++;
        return;
      }
      if (document.activeElement !== canvas || !MOVEMENT_KEYS.has(event.code)) return;
      event.preventDefault();
      keys.current.add(event.code);
    };
    const up = (event: KeyboardEvent) => { keys.current.delete(event.code); };
    const pointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.button !== 2) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const pointerMove = (event: PointerEvent) => {
      if (seating.current.active) return;
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      if (pointers.size === 1) {
        orbit.current.yaw -= dx * 0.005;
        orbit.current.pitch = MathUtils.clamp(orbit.current.pitch - dy * 0.005, 0.3, Math.PI * 0.52);
      } else {
        const other = [...pointers.entries()].find(([id]) => id !== event.pointerId)?.[1];
        if (other) {
          const before = Math.hypot(previous.x - other.x, previous.y - other.y);
          const after = Math.hypot(event.clientX - other.x, event.clientY - other.y);
          orbit.current.distance = MathUtils.clamp(orbit.current.distance + (before - after) * 0.025, 1.8, 10);
        }
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    };
    const pointerUp = (event: PointerEvent) => { pointers.delete(event.pointerId); };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (seating.current.active) return;
      orbit.current.distance = MathUtils.clamp(orbit.current.distance * Math.exp(event.deltaY * 0.001), 1.8, 10);
    };
    const context = (event: Event) => event.preventDefault();
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    document.addEventListener("visibilitychange", visibility);
    canvas.addEventListener("focus", focus);
    canvas.addEventListener("blur", clear);
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp);
    canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("lostpointercapture", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    canvas.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      document.removeEventListener("visibilitychange", visibility);
      canvas.removeEventListener("focus", focus);
      canvas.removeEventListener("blur", clear);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp);
      canvas.removeEventListener("pointercancel", pointerUp);
      canvas.removeEventListener("lostpointercapture", pointerUp);
      canvas.removeEventListener("wheel", wheel);
      canvas.removeEventListener("contextmenu", context);
      keys.current.clear();
      input.current.buttons.clear();
    };
  }, [gl, input, onControlFocus, doorInteraction, seating, toadInteraction]);

  useBeforePhysicsStep(() => {
    const playerBody = body.current;
    const playerCollider = collider.current;
    const character = controller.current;
    if (!playerBody || !playerCollider || !character) return;
    const state = movement.current;
    const net = network?.current;
    const toad = toadInteraction.current;
    const ritual = toadState.current;
    const toadRequested = ritual.request !== toad.request;
    const toadCancelled = ritual.cancel !== toad.cancel;
    ritual.request = toad.request;
    ritual.cancel = toad.cancel;
    const finishToad = (message = "") => {
      toad.phase = "idle";
      toad.activeAction = null;
      toad.message = message;
      motion.current.gesture = undefined;
      state.x = state.z = 0;
      character.enableAutostep(0.34, 0.12, false);
    };
    let sitRequested = seatRequests.current.sit !== seating.current.sitRequest;
    let grantedSeat: CampusSeat | undefined;
    const exitRequested = seatRequests.current.exit !== seating.current.exitRequest;
    seatRequests.current = { sit: seating.current.sitRequest, exit: seating.current.exitRequest };
    const releaseNetworkSeat = () => {
      if (net?.connected && (net.ownSeatId || seating.current.pendingSeatId || seating.current.active)) net.releaseSeat();
      seating.current.pendingSeatId = seating.current.pendingSeatRequest = seating.current.networkRejectedSeat = null;
    };
    if (net?.connected && net.spawn) {
      const key = `${net.spawn.x}:${net.spawn.y}:${net.spawn.z}`;
      if (networkSpawn.current !== key) {
        const firstJoin = networkSpawn.current === null;
        const stillAtStart = !!spawn.current && spawn.current.distanceTo(new Vector3().copy(playerBody.translation())) < 0.6;
        const safe = findCampusSpawn(rapier, world, { ...campus, spawnCandidates: [new Vector3(net.spawn.x, net.spawn.y + 2, net.spawn.z), ...campus.spawnCandidates] }, playerCollider, playerBody);
        spawn.current = safe;
        networkSpawn.current = key;
        if (firstJoin && stillAtStart && !seating.current.active) needsReset.current = true;
      }
    }
    if (needsReset.current || isOutsideCampus(playerBody.translation(), campus.bounds)) {
      if (!spawn.current) return;
      finishToad();
      releaseNetworkSeat();
      if (seating.current.active) {
        seating.current.active = null;
        seating.current.screenExpanded = false;
        onSeatedChange(null);
      }
      playerCollider.setSensor(false);
      playerBody.setTranslation(spawn.current, true);
      playerBody.setNextKinematicTranslation(spawn.current);
      state.x = state.z = state.vertical = 0;
      state.heading = Math.PI;
      motion.current.speed = 0;
      motion.current.seated = false;
      orbit.current = { yaw: 0, pitch: 1.12, distance: 5.5 };
      cameraReady.current = false;
      needsReset.current = false;
      return;
    }

    if (!net?.connected) {
      seating.current.pendingSeatId = seating.current.pendingSeatRequest = seating.current.networkRejectedSeat = null;
    } else {
      const reply = net.seatReply;
      if (reply && seating.current.pendingSeatId && reply.requestId === seating.current.pendingSeatRequest) {
        const requestedSeat = seating.current.pendingSeatId;
        seating.current.pendingSeatId = seating.current.pendingSeatRequest = null;
        if (reply.granted && net.ownSeatId === requestedSeat) {
          if (!seating.current.active) { grantedSeat = campus.seats.find((seat) => seat.id === requestedSeat); sitRequested = true; }
        } else {
          seating.current.networkRejectedSeat = requestedSeat;
          if (seating.current.active?.id === requestedSeat) seating.current.exitRequest++;
          else net.releaseSeat();
          onSeatedChange(seating.current.active, reply.message);
        }
      }
      const active = seating.current.active;
      if (active && net.ownSeatId !== active.id && !seating.current.pendingSeatId && seating.current.networkRejectedSeat !== active.id) {
        const request = net.reserveSeat(active.id);
        if (request) { seating.current.pendingSeatId = active.id; seating.current.pendingSeatRequest = request; }
      }
    }

    if (exitRequested && seating.current.active) {
      const seat = seating.current.active;
      const standing = findSeatStandingPosition(rapier, world, seat, playerCollider, playerBody, savedStand.current, {
        halfSegment: PLAYER_HALF_SEGMENT, radius: PLAYER_RADIUS, offset: CHARACTER_OFFSET,
      });
      if (standing) {
        releaseNetworkSeat();
        playerBody.setTranslation(standing, true);
        playerBody.setNextKinematicTranslation(standing);
        playerCollider.setSensor(false);
        seating.current.active = null;
        seating.current.screenExpanded = false;
        motion.current.seated = false;
        keys.current.clear(); input.current.buttons.clear();
        state.x = state.z = state.vertical = 0;
        cameraReady.current = false;
        onSeatedChange(null);
        gl.domElement.focus({ preventScroll: true });
        return;
      }
      onSeatedChange(seat, "Chưa có chỗ đứng an toàn cạnh bàn. Bạn có thể bấm Về điểm xuất phát.");
    }

    if (sitRequested && !seating.current.active) {
      const seat = grantedSeat ?? seating.current.nearby;
      const position = playerBody.translation();
      if (seat && Math.hypot(seat.position.x - position.x, seat.position.z - position.z) < 1.75
        && Math.abs(position.y - PLAYER_HALF_HEIGHT - seat.floorY) < 0.65) {
        const origin = new Vector3(position.x, position.y + 0.6, position.z);
        const direction = seat.eye.clone().sub(origin);
        const distance = direction.length();
        const obstruction = distance > 0.1 && world.castRay(
          new rapier.Ray(origin, direction.normalize()), distance - 0.08, true,
          rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, playerBody,
        );
        if (!obstruction && net?.connected && net.ownSeatId !== seat.id) {
          if (seating.current.pendingSeatId !== seat.id) {
            const request = net.reserveSeat(seat.id);
            if (request) {
              seating.current.pendingSeatId = seat.id; seating.current.pendingSeatRequest = request;
              onSeatedChange(null, "Đang giữ chỗ…");
            }
          }
        } else if (!obstruction) {
          seating.current.pendingSeatId = seating.current.pendingSeatRequest = seating.current.networkRejectedSeat = null;
          savedStand.current = new Vector3(position.x, position.y, position.z);
          seating.current.active = seat;
          playerCollider.setSensor(true);
          keys.current.clear(); input.current.buttons.clear();
          state.x = state.z = state.vertical = 0;
          state.heading = Math.atan2(seat.forward.x, seat.forward.z);
          motion.current.speed = 0;
          motion.current.seated = true;
          onSeatedChange(seat);
        }
      }
      if (grantedSeat && !seating.current.active) {
        releaseNetworkSeat(); onSeatedChange(null, "Bạn đã rời bàn. Hãy đến gần bàn rồi ngồi lại.");
      }
    }

    const seated = seating.current.active;
    if (seated) {
      if (toad.phase !== "idle") finishToad();
      const position = playerBody.translation();
      const blend = 1 - Math.exp(-14 * world.timestep);
      playerBody.setNextKinematicTranslation({
        x: MathUtils.lerp(position.x, seated.position.x, blend),
        y: MathUtils.lerp(position.y, seated.position.y + PLAYER_HALF_HEIGHT - 0.74, blend),
        z: MathUtils.lerp(position.z, seated.position.z, blend),
      });
      return;
    }

    if (input.current.blocked) {
      keys.current.clear(); input.current.buttons.clear();
      if (toad.phase !== "idle") finishToad();
    }
    const pressed = (key: string) => !input.current.blocked && (keys.current.has(key) || input.current.buttons.has(key));
    const forward = Number(pressed("KeyW") || pressed("ArrowUp")) - Number(pressed("KeyS") || pressed("ArrowDown"));
    const right = Number(pressed("KeyD") || pressed("ArrowRight")) - Number(pressed("KeyA") || pressed("ArrowLeft"));
    const running = pressed("ShiftLeft") || pressed("ShiftRight");
    if (toad.phase !== "idle" && (toadCancelled || forward !== 0 || right !== 0)) finishToad("Đã dừng tương tác với Cóc Tiến Sĩ.");
    if (toadRequested && toad.phase === "idle" && !toadCancelled) {
      if (canInteractWithToad(rapier, world, toadSite, playerBody.translation(), playerCollider, playerBody)) {
        toad.activeAction = toad.action;
        toad.phase = toad.action === "touch" ? "approaching" : "gesturing";
        toad.message = "";
        ritual.elapsed = ritual.approachTime = ritual.stalled = 0;
        ritual.distance = Infinity;
        ritual.aligned = false;
        keys.current.clear(); input.current.buttons.clear();
        state.x = state.z = 0;
        motion.current.speed = 0;
        if (toad.action === "touch") character.enableAutostep(0.55, 0.2, false);
      } else toad.message = "Hãy đến gần phía trước Cóc Tiến Sĩ để tương tác.";
    }
    const length = Math.hypot(forward, right) || 1;
    const speed = running ? RUN_SPEED : WALK_SPEED;
    const yaw = orbit.current.yaw;
    const dt = world.timestep;
    let targetX = (right * Math.cos(yaw) - forward * Math.sin(yaw)) / length * speed;
    let targetZ = (-right * Math.sin(yaw) - forward * Math.cos(yaw)) / length * speed;
    if (toad.phase === "approaching" && toadSite) {
      const position = playerBody.translation();
      const remaining = Math.hypot(toadSite.stand.x - position.x, toadSite.stand.z - position.z);
      ritual.approachTime += dt;
      if (remaining < 0.1 && Math.abs(position.y - toadSite.stand.y) < 0.18) {
        toad.phase = "gesturing";
        ritual.elapsed = 0;
        state.x = state.z = 0;
        character.enableAutostep(0.34, 0.12, false);
      } else {
        if (Math.abs(position.z - toadSite.stand.z) < 0.1 && position.x > toadSite.stand.x + 0.65) ritual.aligned = true;
        const waypointX = toadSite.stand.x + (ritual.aligned ? 0 : 0.9);
        const dx = waypointX - position.x;
        const dz = toadSite.stand.z - position.z;
        const distance = Math.hypot(dx, dz);
        ritual.stalled = ritual.distance - distance > 0.002 ? 0 : ritual.stalled + dt;
        ritual.distance = distance;
        if (ritual.approachTime > 6 || ritual.stalled > 1.4) {
          finishToad("Lối tới tượng đang bị chắn. Hãy đứng phía trước bậc đá rồi thử lại.");
          targetX = targetZ = 0;
        } else {
          const velocity = Math.min(2.5, distance / dt);
          targetX = dx / (distance || 1) * velocity;
          targetZ = dz / (distance || 1) * velocity;
        }
      }
    }
    if (toad.phase === "gesturing" && toadSite && toad.activeAction) {
      const position = playerBody.translation();
      state.heading = Math.atan2(toadSite.center.x - position.x, toadSite.center.z - position.z);
      targetX = targetZ = 0;
      state.x = state.z = 0;
      ritual.elapsed += dt;
      const progress = Math.min(ritual.elapsed / TOAD_GESTURE_SECONDS[toad.activeAction], 1);
      motion.current.gesture = { action: toad.activeAction, progress };
      if (progress === 1) finishToad(toad.activeAction === "touch" ? "Đã chạm Cóc Tiến Sĩ." : "Đã chắp tay vái Cóc Tiến Sĩ.");
    }
    state.x = MathUtils.damp(state.x, targetX, 18, dt);
    state.z = MathUtils.damp(state.z, targetZ, 18, dt);
    state.vertical = character.computedGrounded() ? -0.1 : Math.max(state.vertical - 20 * dt, -25);
    character.computeColliderMovement(playerCollider, { x: state.x * dt, y: state.vertical * dt, z: state.z * dt }, rapier.QueryFilterFlags.EXCLUDE_SENSORS);
    const corrected = character.computedMovement();
    const position = playerBody.translation();
    playerBody.setNextKinematicTranslation({
      x: MathUtils.clamp(position.x + corrected.x, campus.bounds.min.x + PLAYER_RADIUS, campus.bounds.max.x - PLAYER_RADIUS),
      y: position.y + corrected.y,
      z: MathUtils.clamp(position.z + corrected.z, campus.bounds.min.z + PLAYER_RADIUS, campus.bounds.max.z - PLAYER_RADIUS),
    });
    if (character.computedGrounded()) state.vertical = -0.1;
    const actualSpeed = Math.hypot(corrected.x, corrected.z) / dt;
    motion.current = { speed: actualSpeed, running: toad.phase === "idle" && running, gesture: motion.current.gesture };
    if (actualSpeed > 0.1 && toad.phase !== "gesturing") state.heading = Math.atan2(corrected.x, corrected.z);
  });

  useFrame((_, delta) => {
    if (!body.current || needsReset.current) return;
    const dt = Math.min(delta, 0.05);
    const position = body.current.translation();
    network?.current.publish({ x: position.x, y: position.y, z: position.z, yaw: movement.current.heading,
      speed: motion.current.speed, running: motion.current.running, seatId: seating.current.active?.id ?? null,
      gesture: motion.current.gesture ?? null });
    if (visual.current) {
      const difference = MathUtils.euclideanModulo(movement.current.heading - visual.current.rotation.y + Math.PI, Math.PI * 2) - Math.PI;
      visual.current.rotation.y += difference * (1 - Math.exp(-16 * dt));
    }
    const seat = seating.current.active;
    if (seat) {
      if (visual.current) visual.current.visible = false;
      camera.position.lerp(seat.eye, 1 - Math.exp(-12 * dt));
      camera.lookAt(seat.screen.position);
      return;
    }
    cameraTarget.set(position.x, position.y + 0.45, position.z);
    if (!cameraReady.current) smoothTarget.copy(cameraTarget);
    else smoothTarget.lerp(cameraTarget, 1 - Math.exp(-18 * dt));
    const { yaw, pitch, distance } = orbit.current;
    cameraDirection.setFromSphericalCoords(1, pitch, yaw);
    const hit = world.castShape(
      smoothTarget, { x: 0, y: 0, z: 0, w: 1 }, cameraDirection, cameraShape, 0, distance, true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider.current ?? undefined, body.current,
    );
    const allowedDistance = hit ? Math.max(0.15, hit.time_of_impact - 0.08) : distance;
    desiredCamera.copy(smoothTarget).addScaledVector(cameraDirection, allowedDistance);
    // Resolve camera obstruction immediately; smooth only the tracking target.
    camera.position.copy(desiredCamera);
    camera.lookAt(smoothTarget);
    if (visual.current) visual.current.visible = allowedDistance > 0.65;
    cameraReady.current = true;
  });

  return (
    <RigidBody ref={body} type="kinematicPosition" colliders={false} position={initialPosition} enabledRotations={[false, false, false]}>
      <CapsuleCollider ref={collider} args={[PLAYER_HALF_SEGMENT, PLAYER_RADIUS]} />
      <group ref={visual} position={[0, -PLAYER_HALF_HEIGHT, 0]}>
        <CampusAvatar character={character} name={name} motion={motion} customization={customization} />
      </group>
    </RigidBody>
  );
}

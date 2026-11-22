import { useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useAfterPhysicsStep, useRapier } from "@react-three/rapier";
import { CatmullRomCurve3, Group, MathUtils, Vector3 } from "three";
import type * as Rapier from "@dimforge/rapier3d-compat";
import { GooseModel } from "./CampusGoose";
import type { CampusNetwork } from "./campusMultiplayer";
import type { CampusWorld } from "./campusWorld";

const FLOCK_SIZE = 8;
const GOOSE_SPACING = 1.4;
const WALK_SPEED = 1.5;
const GROUND_STEP = 0.3;
const MAX_HEIGHT_CHANGE = 0.25;
const DOWN = { x: 0, y: -1, z: 0 };
const UPRIGHT = { x: 0, y: 0, z: 0, w: 1 };

// These are GLB coordinates before prepareCampusWorld centers the map.
const CAMPUS_LOOP = [
  // Alpha forecourt and the west walk around the building.
  [0, 13.4], [-14, 13.4], [-33, 13.4], [-51, 13.4], [-57, 12], [-60, 8],
  [-60, -7], [-57, -12], [-50, -14], [-28, -14], [-3, -14], [13, -14],
  // Avenue toward Beta and the return along the other side of the avenue.
  [19, -15], [20.5, -19], [21, -28], [21, -45], [21, -65], [20, -78], [18, -83],
  [20, -85], [25, -85], [28, -83], [28, -77], [25, -63], [24, -49], [24, -29], [25, -19],
  // Rear forecourt and the east walk back to the starting area.
  [29, -14], [48, -13], [58, -13], [62, -9], [63, -3], [63, 5],
  [59, 11], [52, 13.4], [32, 13.4], [10, 13.4],
];
const FORECOURT_LOOP = [
  [-6, 11.6], [-2, 11.5], [2, 11.5], [3.4, 12.7], [2, 14], [-2, 14], [-6, 14], [-7.5, 12.9],
];

interface GoosePatrol {
  samples: Vector3[];
  length: number;
}

function samplePatrol(
  waypoints: number[][],
  offset: Vector3,
  world: Rapier.World,
  rapier: Pick<typeof Rapier, "Capsule" | "Ray" | "QueryFilterFlags">,
): GoosePatrol | null {
  const curve = new CatmullRomCurve3(
    waypoints.map(([x, z]) => new Vector3(x + offset.x, 0, z + offset.z)),
    true,
  );
  curve.arcLengthDivisions = 2048;
  const length = curve.getLength();
  const count = Math.ceil(length / GROUND_STEP);
  const samples: Vector3[] = [];
  const clearance = new rapier.Capsule(0.19, 0.47);
  const fixedOnly = rapier.QueryFilterFlags.ONLY_FIXED;

  for (let i = 0; i < count; i++) {
    const point = curve.getPointAt(i / count);
    const origin = { x: point.x, y: 2.6, z: point.z };
    const ground = world.castRayAndGetNormal(new rapier.Ray(origin, DOWN), 3.8, true, fixedOnly);
    if (!ground || ground.normal.y < 0.7) return null;
    point.y = origin.y - ground.timeOfImpact;
    if (point.y > 0.48 || (i > 0 && Math.abs(point.y - samples[i - 1].y) > MAX_HEIGHT_CHANGE)) return null;

    // Check a wider envelope than the walking model along the whole loop.
    const center = { x: point.x, y: point.y + 0.71, z: point.z };
    if (world.intersectionWithShape(center, UPRIGHT, clearance, fixedOnly)) return null;
    samples.push(point);
  }

  if (Math.abs(samples[0].y - samples[count - 1].y) > MAX_HEIGHT_CHANGE) return null;
  return { samples, length };
}

export function CampusGooseFlock({ campus, network, positions }: {
  campus: CampusWorld;
  network: MutableRefObject<CampusNetwork>;
  positions: MutableRefObject<Vector3[]>;
}) {
  const { world, rapier } = useRapier();
  const patrol = useRef<GoosePatrol | null>();
  const birds = useRef<(Group | null)[]>([]);
  const walkTime = useRef(0);

  useAfterPhysicsStep(() => {
    if (patrol.current !== undefined) return;
    const offset = campus.object.position;
    patrol.current = samplePatrol(CAMPUS_LOOP, offset, world, rapier)
      ?? samplePatrol(FORECOURT_LOOP, offset, world, rapier);
  });

  useFrame(() => {
    positions.current.length = 0;
    if (!patrol.current) return;

    const { samples, length } = patrol.current;
    const clock = network.current.serverClock;
    // Keep extrapolating the latest server time during a reconnect.
    const now = clock ? clock.time + (performance.now() - clock.receivedAt) : Date.now();
    walkTime.current = now / 1000;
    const distance = (walkTime.current * WALK_SPEED) % length;
    birds.current.forEach((bird, index) => {
      if (!bird) return;
      const progress = MathUtils.euclideanModulo(distance - index * GOOSE_SPACING, length);
      const sample = progress * samples.length / length;
      const segment = Math.floor(sample);
      const fraction = sample - segment;
      const start = samples[segment];
      const end = samples[(segment + 1) % samples.length];
      bird.position.lerpVectors(start, end, fraction);
      bird.position.y += 0.012;

      // Interpolate the path tangent so the heading depends only on the shared position.
      const previous = samples[(segment + samples.length - 1) % samples.length];
      const next = samples[(segment + 2) % samples.length];
      const dx = MathUtils.lerp(end.x - previous.x, next.x - start.x, fraction);
      const dz = MathUtils.lerp(end.z - previous.z, next.z - start.z, fraction);
      bird.rotation.y = Math.atan2(dx, dz) - Math.PI / 2;
      bird.visible = true;
      positions.current.push(bird.position);
    });
  }, -1);

  return (
    <group name="CampusGooseFlock">
      {Array.from({ length: FLOCK_SIZE }, (_, i) => (
        <group key={i} ref={(bird) => { birds.current[i] = bird; }} scale={0.57} visible={false}>
          <GooseModel walkTime={walkTime} strideOffset={i * 1.73} />
        </group>
      ))}
    </group>
  );
}

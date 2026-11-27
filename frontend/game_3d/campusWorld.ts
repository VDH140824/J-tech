import { Box3, BoxGeometry, Group, Material, Mesh, MeshStandardMaterial, Quaternion, Vector3, type Object3D } from "three";
import type * as Rapier from "@dimforge/rapier3d-compat";
import { extractCampusSeats, isSolidFurniture, type CampusSeat } from "./campusSeating";
import { applyRealisticMaterials } from "./campusMaterials";

export const PLAYER_RADIUS = 0.28;
export const PLAYER_HALF_SEGMENT = 0.56;
export const PLAYER_HALF_HEIGHT = PLAYER_RADIUS + PLAYER_HALF_SEGMENT;
export const CHARACTER_OFFSET = 0.025;
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 5.6;

export interface CampusDoor {
  id: string;
  label: string;
  object: Object3D;
  hinge: Vector3;
  bounds: Box3;
  center: Vector3;
  halfExtents: Vector3;
}

export interface CampusWorld {
  object: Group;
  bounds: Box3;
  vertices: Float32Array;
  indices: Uint32Array;
  spawnCandidates: Vector3[];
  doors: CampusDoor[];
  seats: CampusSeat[];
}

// Decorative meshes remain visible, but do not need detailed physics shapes.
const DECORATION = /occupants|template|foliage|leaves|petals|blossom|flower|grass|shrub|\bfont\b|\blabel\b|\btext\b|handle|hinge|tread edges|light lenses|diffusers/i;

function extractCampusDoors(object: Group): CampusDoor[] {
  const leaves: Object3D[] = [];
  object.traverse((child) => {
    if (/^(?:ALPHA_DOOR_[LR]\d+|BETA_DOOR_B\d+)$/.test(child.name)) leaves.push(child);
  });
  return leaves.map((leaf) => {
    const pivot = leaf.parent?.name.startsWith("BETA_HINGE_") ? leaf.parent : leaf;
    const bounds = new Box3();
    leaf.traverseVisible((child) => {
      if (!(child instanceof Mesh) || /handle/i.test(child.name)) return;
      child.geometry.computeBoundingBox();
      if (child.geometry.boundingBox) bounds.union(child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld));
    });
    const hinge = new Vector3();
    const orientation = new Quaternion();
    const scale = new Vector3();
    pivot.matrixWorld.decompose(hinge, orientation, scale);
    const center = bounds.getCenter(new Vector3()).sub(hinge);
    const halfExtents = bounds.getSize(new Vector3()).multiplyScalar(0.5);
    // Move only the leaf and its handle. The door frame stays in the static map.
    pivot.removeFromParent();
    pivot.position.set(0, 0, 0);
    pivot.quaternion.copy(orientation);
    pivot.scale.copy(scale);
    pivot.updateMatrixWorld(true);
    const room = leaf.name.replace(/^(ALPHA|BETA)_DOOR_/, "");
    return {
      id: leaf.name,
      label: `${leaf.name.startsWith("ALPHA") ? "Alpha" : "Beta"} · Phòng ${room}`,
      object: pivot, hinge, bounds, center, halfExtents,
    };
  });
}

export function nearbyCampusDoor(
  doors: CampusDoor[],
  player: { x: number; y: number; z: number },
  reachable: (door: CampusDoor) => boolean = () => true,
): CampusDoor | undefined {
  let nearest: CampusDoor | undefined;
  let shortest = 2.1;
  for (const door of doors) {
    // Do not offer a door on the floor above or below the player.
    if (Math.abs(player.y - PLAYER_HALF_HEIGHT - door.bounds.min.y) > 0.65) continue;
    const dx = Math.max(door.bounds.min.x - player.x, 0, player.x - door.bounds.max.x);
    const dz = Math.max(door.bounds.min.z - player.z, 0, player.z - door.bounds.max.z);
    const distance = Math.hypot(dx, dz);
    if (distance < shortest && reachable(door)) {
      nearest = door;
      shortest = distance;
    }
  }
  return nearest;
}

export function doorOpeningAngle(door: CampusDoor, player: { x: number; z: number }) {
  const side = door.center.z * (player.x - door.hinge.x) - door.center.x * (player.z - door.hinge.z);
  return (side > 0 ? -1 : 1) * Math.PI / 2;
}

export function doorSweepBlocked(door: CampusDoor, from: number, to: number, player: { x: number; y: number; z: number }) {
  // Sample the swept leaf conservatively, including the character's capsule.
  const steps = Math.max(1, Math.ceil(Math.abs(to - from) / 0.015));
  const reach = Math.hypot(door.center.x, door.center.z) + Math.hypot(door.halfExtents.x, door.halfExtents.z);
  const radius = PLAYER_RADIUS + 0.01 + reach * Math.abs(to - from) / steps / 2;
  const x = player.x - door.hinge.x;
  const z = player.z - door.hinge.z;
  const dy = Math.max(0, Math.abs(player.y - door.hinge.y - door.center.y) - PLAYER_HALF_SEGMENT - door.halfExtents.y);
  for (let index = 1; index <= steps; index++) {
    const angle = from + (to - from) * index / steps;
    const localX = x * Math.cos(angle) - z * Math.sin(angle);
    const localZ = x * Math.sin(angle) + z * Math.cos(angle);
    const dx = Math.max(0, Math.abs(localX - door.center.x) - door.halfExtents.x);
    const dz = Math.max(0, Math.abs(localZ - door.center.z) - door.halfExtents.z);
    if (dx * dx + dy * dy + dz * dz < radius * radius) return true;
  }
  return false;
}

function createRoadBlock(
  minX: number, maxX: number,
  minY: number, maxY: number,
  minZ: number, maxZ: number,
  material: Material,
  uvTileScale = 0.625,
): Mesh {
  const width = Math.max(0.01, maxX - minX);
  const height = Math.max(0.01, maxY - minY);
  const depth = Math.max(0.01, maxZ - minZ);
  const geometry = new BoxGeometry(width, height, depth);
  const uvs = geometry.getAttribute("uv");
  if (uvs) {
    const uMin = minX * uvTileScale;
    const uMax = maxX * uvTileScale;
    const vMin = minZ * uvTileScale;
    const vMax = maxZ * uvTileScale;
    uvs.setXY(8, uMin, vMin);
    uvs.setXY(9, uMax, vMin);
    uvs.setXY(10, uMin, vMax);
    uvs.setXY(11, uMax, vMax);
    uvs.needsUpdate = true;
  }
  const mesh = new Mesh(geometry, material);
  mesh.name = `ROAD_BLOCK_${Math.round(minX)}_${Math.round(minZ)}`;
  mesh.position.set((minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2);
  return mesh;
}

function widenCampusRoad(object: Group) {
  let redMat: Material | undefined;
  let greyMat: Material | undefined;
  let curbMat: Material | undefined;
  let earthMat: Material | undefined;

  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((mat) => {
      const name = mat.name.toLowerCase();
      if (!redMat && name.includes("red interlocking")) redMat = mat;
      if (!greyMat && name.includes("grey interlocking")) greyMat = mat;
      if (!curbMat && name.includes("curb")) curbMat = mat;
      if (!earthMat && name.includes("earth")) earthMat = mat;
    });
  });

  const fallbackRed = redMat || new MeshStandardMaterial({ color: "#8b2518", roughness: 0.85 });
  const fallbackGrey = greyMat || new MeshStandardMaterial({ color: "#787672", roughness: 0.85 });
  const fallbackCurb = curbMat || new MeshStandardMaterial({ color: "#a8a5a0", roughness: 0.7 });
  const fallbackEarth = earthMat || new MeshStandardMaterial({ color: "#423b32", roughness: 0.95 });

  const extensions = new Group();
  extensions.name = "CAMPUS_ROAD_EXTENSIONS";

  // 1. Red paver avenue extensions (widened to 25.5m and lengthened past the 2 trees to -88m)
  extensions.add(createRoadBlock(26.15, 33.5, -0.088, 0.012, -88.0, -18.5, fallbackRed));
  extensions.add(createRoadBlock(8.0, 16.15, -0.088, 0.012, -88.0, -18.5, fallbackRed));
  extensions.add(createRoadBlock(16.15, 26.15, -0.088, 0.012, -88.0, -70.5, fallbackRed));

  // 2. Sidewalks along both flanks and terminating end
  extensions.add(createRoadBlock(33.5, 36.5, -0.068, 0.032, -88.0, -18.5, fallbackGrey));
  extensions.add(createRoadBlock(5.5, 8.0, -0.068, 0.032, -88.0, -18.5, fallbackGrey));
  extensions.add(createRoadBlock(5.5, 36.5, -0.068, 0.032, -88.0, -85.5, fallbackGrey));

  // 3. Concrete curbs protecting the sidewalk edges
  extensions.add(createRoadBlock(36.5, 36.8, -0.08, 0.05, -88.4, -18.5, fallbackCurb));
  extensions.add(createRoadBlock(5.2, 5.5, -0.08, 0.05, -88.4, -18.5, fallbackCurb));
  extensions.add(createRoadBlock(5.2, 36.8, -0.08, 0.05, -88.4, -88.0, fallbackCurb));

  // 4. Solid foundation/earth base underneath to seal any abyss/void
  extensions.add(createRoadBlock(5.0, 37.0, -0.60, -0.08, -89.0, -18.0, fallbackEarth));

  object.add(extensions);
}

export function prepareCampusWorld(scene: Object3D): CampusWorld {
  const object = new Group();
  object.add(scene.clone(true));
  applyRealisticMaterials(object);
  const sourceBounds = new Box3().setFromObject(object);
  const center = sourceBounds.getCenter(new Vector3());
  widenCampusRoad(object);
  // Preserve the GLB's original meter scale so stairs match the avatar's size.
  object.position.set(-center.x, 0, -center.z);
  object.updateMatrixWorld(true);
  const bounds = new Box3().setFromObject(object);
  const seats = extractCampusSeats(object);
  const doors = extractCampusDoors(object);
  const meshes: Mesh[] = [];
  let vertexCount = 0;
  let indexCount = 0;

  object.traverseVisible((child) => {
    if (!(child instanceof Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const furniture = isSolidFurniture(child.name) || materials.some((material) => isSolidFurniture(material.name));
    if (DECORATION.test(child.name) && !furniture) return;
    const positions = child.geometry.getAttribute("position");
    if (!positions || positions.count < 3) return;
    meshes.push(child);
    vertexCount += positions.count;
    indexCount += child.geometry.index?.count ?? positions.count;
  });
  if (!indexCount) throw new Error("Map has no collision geometry");

  const vertices = new Float32Array(vertexCount * 3);
  const indices = new Uint32Array(indexCount);
  const point = new Vector3();
  let vertexOffset = 0;
  let indexOffset = 0;
  for (const mesh of meshes) {
    const positions = mesh.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index++) {
      point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
      point.toArray(vertices, (vertexOffset + index) * 3);
    }
    const sourceIndices = mesh.geometry.index;
    const count = sourceIndices?.count ?? positions.count;
    const mirrored = mesh.matrixWorld.determinant() < 0;
    for (let index = 0; index + 2 < count; index += 3) {
      indices[indexOffset++] = vertexOffset + (sourceIndices?.getX(index) ?? index);
      indices[indexOffset++] = vertexOffset + (sourceIndices?.getX(index + (mirrored ? 2 : 1)) ?? index + (mirrored ? 2 : 1));
      indices[indexOffset++] = vertexOffset + (sourceIndices?.getX(index + (mirrored ? 1 : 2)) ?? index + (mirrored ? 1 : 2));
    }
    vertexOffset += positions.count;
  }

  // Prefer the open courtyard in front of Alpha, then search the campus grounds.
  const spawnCandidates = [[0, 12], [-8, 12], [8, 12], [0, 9], [40, -52]]
    .map(([x, z]) => new Vector3(x - center.x, 3, z - center.z));
  for (let z = bounds.max.z - 3; z > bounds.min.z + 3; z -= 4) {
    for (let x = bounds.min.x + 3; x < bounds.max.x - 3; x += 4) {
      spawnCandidates.push(new Vector3(x, 3, z));
    }
  }
  return { object, bounds, vertices, indices: indices.subarray(0, indexOffset), spawnCandidates, doors, seats };
}

export function findCampusSpawn(
  rapier: Pick<typeof Rapier, "Capsule" | "Ray" | "QueryFilterFlags">,
  world: Rapier.World,
  campus: CampusWorld,
  playerCollider: Rapier.Collider,
  playerBody: Rapier.RigidBody,
): Vector3 {
  world.updateSceneQueries();
  const capsule = new rapier.Capsule(PLAYER_HALF_SEGMENT, PLAYER_RADIUS + CHARACTER_OFFSET);
  for (const origin of campus.spawnCandidates) {
    const hit = world.castRayAndGetNormal(
      new rapier.Ray(origin, { x: 0, y: -1, z: 0 }), 8, true,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, playerBody,
    );
    if (!hit || hit.normal.y < 0.7) continue;
    const position = new Vector3(origin.x, origin.y - hit.timeOfImpact + PLAYER_HALF_HEIGHT + CHARACTER_OFFSET * 3, origin.z);
    const obstructed = world.intersectionWithShape(
      position, { x: 0, y: 0, z: 0, w: 1 }, capsule,
      rapier.QueryFilterFlags.EXCLUDE_SENSORS, undefined, playerCollider, playerBody,
    );
    if (!obstructed) return position;
  }
  throw new Error("Map has no safe player spawn");
}

export function isOutsideCampus(position: { x: number; y: number; z: number }, bounds: Box3) {
  return !Number.isFinite(position.x + position.y + position.z)
    || position.y < bounds.min.y - 6
    || position.x < bounds.min.x - 1 || position.x > bounds.max.x + 1
    || position.z < bounds.min.z - 1 || position.z > bounds.max.z + 1;
}

import { Box3, Matrix3, Matrix4, Mesh, Quaternion, Vector3, type Object3D } from "three";
import type * as Rapier from "@dimforge/rapier3d-compat";

export interface CampusSeat {
  id: string;
  label: string;
  position: Vector3;
  floorY: number;
  forward: Vector3;
  eye: Vector3;
  screen: { position: Vector3; rotation: Quaternion; width: number; height: number };
}

export interface SeatingControl {
  nearby: CampusSeat | null;
  active: CampusSeat | null;
  sitRequest: number;
  exitRequest: number;
  screenExpanded: boolean;
  expandRequest: number;
  pendingSeatId?: string | null;
  pendingSeatRequest?: string | null;
  networkRejectedSeat?: string | null;
}

export function isSolidFurniture(name: string) {
  return /desk|desktop|chair|table|sofa|stool|bench|seat|laminate|tubular furniture|perforated.*panel/i.test(name);
}

interface DisplaySurface { bounds: Box3; normal: Vector3 }

function displaySurfaces(mesh: Mesh): DisplaySurface[] {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute("position");
  if (!positions) return [];
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const selected = new Set(materials.flatMap((material, index) =>
    /netbeans.*(display|screen)|monitor.*display|laptop.*screen/i.test(material.name) ? [index] : [],
  ));
  if (!selected.size) return [];
  const count = geometry.index?.count ?? positions.count;
  const groups = Array.isArray(mesh.material) && geometry.groups.length
    ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
  const parents: number[] = [];
  const points: Vector3[] = [];
  const welded = new Map<string, number>();
  const vertexIds = new Map<number, number>();
  const normals = new Map<number, Vector3>();
  const normalMatrix = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const root = (index: number): number => {
    while (parents[index] !== index) { parents[index] = parents[parents[index]]; index = parents[index]; }
    return index;
  };
  const vertex = (index: number) => {
    const cached = vertexIds.get(index);
    if (cached !== undefined) return cached;
    const point = new Vector3().fromBufferAttribute(positions, index);
    const key = `${Math.round(point.x * 10000)},${Math.round(point.y * 10000)},${Math.round(point.z * 10000)}`;
    let id = welded.get(key);
    if (id === undefined) { id = points.length; welded.set(key, id); points.push(point.applyMatrix4(mesh.matrixWorld)); parents.push(id); }
    vertexIds.set(index, id);
    return id;
  };
  for (const group of groups) {
    if (!selected.has(group.materialIndex ?? 0)) continue;
    for (let index = group.start; index + 2 < Math.min(count, group.start + group.count); index += 3) {
      const source = geometry.index?.getX(index) ?? index;
      const a = vertex(source);
      const b = vertex(geometry.index?.getX(index + 1) ?? index + 1);
      const c = vertex(geometry.index?.getX(index + 2) ?? index + 2);
      parents[root(b)] = root(a); parents[root(c)] = root(a);
      const normalAttribute = geometry.getAttribute("normal");
      const normal = normalAttribute
        ? new Vector3().fromBufferAttribute(normalAttribute, source).applyMatrix3(normalMatrix).normalize()
        : points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a])).normalize();
      if (normal.lengthSq() > 0.1) normals.set(a, normal);
    }
  }
  const components = new Map<number, DisplaySurface>();
  points.forEach((point, index) => {
    const id = root(index);
    const component = components.get(id) ?? { bounds: new Box3(), normal: new Vector3(0, 0, 1) };
    component.bounds.expandByPoint(point);
    const normal = normals.get(index);
    if (normal) component.normal.copy(normal);
    components.set(id, component);
  });
  return [...components.values()].filter(({ bounds }) => {
    const size = bounds.getSize(new Vector3());
    return size.y > 0.08 && size.y < 0.7 && Math.max(size.x, size.z) > 0.15 && Math.max(size.x, size.z) < 1.2;
  });
}

export function extractCampusSeats(object: Object3D): CampusSeat[] {
  object.updateWorldMatrix(true, true);
  const markers: Object3D[] = [];
  const displays: DisplaySurface[] = [];
  object.traverseVisible((child) => {
    if (/ALPHA_OCCUPANTS_Player_workstation_[LR]\d+|ALPHA_OCCUPANTS_Player workstation_[LR]\d+|BETA_Player[ _]seat[ _]B\d+/.test(child.name)) markers.push(child);
    if (child instanceof Mesh) displays.push(...displaySurfaces(child));
  });
  const up = new Vector3(0, 1, 0);
  return markers.flatMap((marker) => {
    const position = marker.getWorldPosition(new Vector3());
    const eye = position.clone().add(new Vector3(0, 0.78, 0));
    const nearby = displays.filter(({ bounds }) => {
      const center = bounds.getCenter(new Vector3());
      return center.y > position.y + 0.05 && center.y < eye.y + 0.15
        && Math.hypot(center.x - position.x, center.z - position.z) < 1.4;
    }).sort((a, b) => a.bounds.getCenter(new Vector3()).distanceToSquared(position) - b.bounds.getCenter(new Vector3()).distanceToSquared(position));
    const display = nearby[0];
    if (!display) return [];
    const center = display.bounds.getCenter(new Vector3());
    const normal = display.normal.clone();
    if (normal.dot(eye.clone().sub(center)) < 0) normal.negate();
    const right = up.clone().cross(normal).normalize();
    const screenUp = normal.clone().cross(right).normalize();
    const rotation = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(right, screenUp, normal));
    const size = display.bounds.getSize(new Vector3());
    const forward = center.clone().sub(position).setY(0).normalize();
    const room = marker.name.match(/([LRB]\d+)$/)?.[1] ?? "";
    return [{
      id: marker.name, label: `${room.startsWith("B") ? "Beta" : "Alpha"} · Phòng ${room}`,
      position, floorY: position.y - (room.startsWith("B") ? 0.46 : 0.5), forward, eye,
      screen: { position: center.addScaledVector(normal, 0.008), rotation,
        width: Math.max(0.18, Math.abs(right.x) * size.x + Math.abs(right.z) * size.z) * 0.94,
        height: Math.max(0.1, size.y) * 0.94 },
    }];
  });
}

export function nearbyCampusSeat(seats: CampusSeat[], position: { x: number; y: number; z: number }, halfHeight: number, reachable: (seat: CampusSeat) => boolean) {
  return seats.filter((seat) => Math.abs(position.y - halfHeight - seat.floorY) < 0.65
    && Math.hypot(position.x - seat.position.x, position.z - seat.position.z) < 1.65 && reachable(seat))
    .sort((a, b) => Math.hypot(position.x - a.position.x, position.z - a.position.z) - Math.hypot(position.x - b.position.x, position.z - b.position.z))[0];
}

export function findSeatStandingPosition(
  rapier: Pick<typeof Rapier, "Capsule" | "Ray" | "QueryFilterFlags">,
  world: Rapier.World, seat: CampusSeat, collider: Rapier.Collider, body: Rapier.RigidBody,
  preferred: Vector3 | undefined, capsule: { halfSegment: number; radius: number; offset: number },
): Vector3 | undefined {
  const candidates = preferred ? [preferred.clone()] : [];
  for (const radius of [0.8, 1.2, 1.6]) {
    for (let index = 0; index < 12; index++) {
      const angle = index * Math.PI / 6;
      candidates.push(new Vector3(seat.position.x + Math.sin(angle) * radius, seat.floorY, seat.position.z + Math.cos(angle) * radius));
    }
  }
  world.updateSceneQueries();
  const shape = new rapier.Capsule(capsule.halfSegment, capsule.radius + capsule.offset);
  const flags = rapier.QueryFilterFlags.EXCLUDE_SENSORS;
  for (const candidate of candidates) {
    const origin = { x: candidate.x, y: seat.floorY + 2.5, z: candidate.z };
    const floor = world.castRayAndGetNormal(new rapier.Ray(origin, { x: 0, y: -1, z: 0 }), 3, true, flags, undefined, collider, body);
    if (!floor || floor.normal.y < 0.7) continue;
    const floorY = origin.y - floor.timeOfImpact;
    if (Math.abs(floorY - seat.floorY) > 0.3) continue;
    const position = new Vector3(candidate.x, floorY + capsule.halfSegment + capsule.radius + capsule.offset * 3, candidate.z);
    if (world.intersectionWithShape(position, { x: 0, y: 0, z: 0, w: 1 }, shape, flags, undefined, collider, body)) continue;
    const sightTarget = new Vector3(position.x, floorY + 1.3, position.z);
    const sight = sightTarget.sub(seat.eye);
    const length = sight.length();
    if (length > 0.1 && world.castRay(new rapier.Ray(seat.eye, sight.normalize()), length - 0.08, true, flags, undefined, collider, body)) continue;
    return position;
  }
  return undefined;
}

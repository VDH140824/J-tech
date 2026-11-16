import { Box3, Color, Material, Mesh, MeshStandardMaterial, Vector3, type Object3D } from "three";

export type CampusTime = "day" | "night";
type LightingRole = "lamp" | "window";

export interface CampusLightAnchor {
  position: Vector3;
  indoor: boolean;
  intensity: number;
  distance: number;
}

interface MaterialBinding {
  material: MeshStandardMaterial;
  role: LightingRole;
  emissive: Color;
  intensity: number;
  opacity: number;
}

export interface CampusLighting {
  anchors: CampusLightAnchor[];
  setTime: (time: CampusTime) => void;
  dispose: () => void;
}

function lightingRole(material: Material, mesh: Mesh): LightingRole | undefined {
  const name = material.name.toLowerCase().replace(/_/g, " ");
  if (/classroom led diffuser|arcade luminous panels|ivory lamp (globes|glass)|ceiling lights?\b/.test(name)) return "lamp";
  if (/clear stairwell glazing|clear architectural glazing|frosted glass bands|dark blue tinted glass/.test(name)
    && /glazing|facade.*glass|room.*glass|window/i.test(mesh.name)
    && !/skylight|partition|frame|mullion|transom|motif/i.test(mesh.name)) return "window";
  return undefined;
}

function lampAnchors(mesh: Mesh, lampMaterials: Set<number>): CampusLightAnchor[] {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute("position");
  if (!positions) return [];
  // A GLB mesh can contain many lamps. Split the emissive geometry into connected
  // components instead of putting one light at the center of the entire campus.
  const parents: number[] = [];
  const points: Vector3[] = [];
  const welded = new Map<string, number>();
  const vertexIds = new Map<number, number>();
  const root = (index: number): number => {
    while (parents[index] !== index) {
      parents[index] = parents[parents[index]];
      index = parents[index];
    }
    return index;
  };
  const vertex = (index: number) => {
    const cached = vertexIds.get(index);
    if (cached !== undefined) return cached;
    const point = new Vector3().fromBufferAttribute(positions, index);
    const key = `${Math.round(point.x * 10000)},${Math.round(point.y * 10000)},${Math.round(point.z * 10000)}`;
    let id = welded.get(key);
    if (id === undefined) {
      id = points.length;
      welded.set(key, id);
      points.push(point.applyMatrix4(mesh.matrixWorld));
      parents.push(id);
    }
    vertexIds.set(index, id);
    return id;
  };
  const count = geometry.index?.count ?? positions.count;
  const groups = Array.isArray(mesh.material) && geometry.groups.length
    ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
  for (const group of groups) {
    if (!lampMaterials.has(group.materialIndex ?? 0)) continue;
    const end = Math.min(count, group.start + group.count);
    for (let index = group.start; index + 2 < end; index += 3) {
      const a = vertex(geometry.index?.getX(index) ?? index);
      const b = vertex(geometry.index?.getX(index + 1) ?? index + 1);
      const c = vertex(geometry.index?.getX(index + 2) ?? index + 2);
      parents[root(b)] = root(a);
      parents[root(c)] = root(a);
    }
  }
  const components = new Map<number, Box3>();
  points.forEach((point, index) => {
    const id = root(index);
    const bounds = components.get(id) ?? new Box3();
    bounds.expandByPoint(point);
    components.set(id, bounds);
  });
  const indoor = !/lamp|bollard|spot.*lens/i.test(mesh.name);
  return [...components.values()].map((bounds) => {
    const position = bounds.getCenter(new Vector3());
    if (indoor) position.y -= 0.18;
    return { position, indoor, intensity: indoor ? 45 : 85, distance: indoor ? 10 : 15 };
  });
}

export function createCampusLighting(objects: Object3D[]): CampusLighting {
  const originals: { mesh: Mesh; material: Material | Material[] }[] = [];
  const bindings: MaterialBinding[] = [];
  const clones = new Map<Material, Map<LightingRole, MeshStandardMaterial>>();
  const anchors: CampusLightAnchor[] = [];
  const anchorKeys = new Set<string>();
  for (const object of objects) {
    object.updateWorldMatrix(true, true);
    object.traverseVisible((child) => {
      if (!(child instanceof Mesh)) return;
      const source = child.material;
      const materials = Array.isArray(source) ? source : [source];
      const lampMaterials = new Set<number>();
      let changed = false;
      const replacements = materials.map((material, index) => {
        const role = lightingRole(material, child);
        if (!role || !(material instanceof MeshStandardMaterial)) return material;
        changed = true;
        if (role === "lamp") lampMaterials.add(index);
        const byRole = clones.get(material) ?? new Map<LightingRole, MeshStandardMaterial>();
        clones.set(material, byRole);
        let clone = byRole.get(role);
        if (!clone) {
          clone = material.clone();
          byRole.set(role, clone);
          bindings.push({ material: clone, role, emissive: material.emissive.clone(), intensity: material.emissiveIntensity, opacity: material.opacity });
        }
        return clone;
      });
      if (!changed) return;
      originals.push({ mesh: child, material: source });
      if (lampMaterials.size) {
        for (const anchor of lampAnchors(child, lampMaterials)) {
          const { x, y, z } = anchor.position;
          const key = `${Math.round(x * 2)},${Math.round(y * 2)},${Math.round(z * 2)}`;
          if (!anchorKeys.has(key)) {
            anchorKeys.add(key);
            anchors.push(anchor);
          }
        }
      }
      child.material = Array.isArray(source) ? replacements : replacements[0];
    });
  }
  const lampColor = new Color("#ffe0a3");
  const windowColor = new Color("#ffd39a");
  return {
    anchors,
    setTime(time) {
      for (const binding of bindings) {
        const { material, role } = binding;
        if (time === "night") {
          material.emissive.copy(role === "lamp" ? lampColor : windowColor);
          material.emissiveIntensity = role === "lamp" ? 3 : 0.85;
          if (role === "window" && material.transparent) material.opacity = Math.max(binding.opacity, 0.5);
        } else {
          material.emissive.copy(binding.emissive);
          material.emissiveIntensity = binding.intensity;
          material.opacity = binding.opacity;
        }
      }
    },
    dispose() {
      for (const { mesh, material } of originals) mesh.material = material;
      for (const { material } of bindings) material.dispose();
    },
  };
}

export function nearbyCampusLights(anchors: CampusLightAnchor[], position: { x: number; y: number; z: number }, limit = 6) {
  const distanceSquared = (anchor: CampusLightAnchor) => (anchor.position.x - position.x) ** 2
    + (anchor.position.y - position.y) ** 2 + (anchor.position.z - position.z) ** 2;
  return anchors
    .filter((anchor) => {
      const dy = anchor.position.y - position.y;
      return (!anchor.indoor || (dy > 0.2 && dy < 4.5))
        && distanceSquared(anchor) < (anchor.distance + 5) ** 2;
    })
    .sort((a, b) => distanceSquared(a) - distanceSquared(b))
    .slice(0, Math.max(0, limit));
}

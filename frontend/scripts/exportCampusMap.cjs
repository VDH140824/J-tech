// Run from any directory: node frontend/scripts/exportCampusMap.cjs
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const THREE = require("three");
const root = path.resolve(__dirname, "..");
const cache = new Map();
function sourceModule(file) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {};
  cache.set(absolute, exports);
  const js = ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function("require", "exports", js)((name) => name.startsWith(".")
    ? sourceModule(path.relative(root, path.resolve(path.dirname(absolute), `${name}.ts`))) : require(name), exports);
  return exports;
}
async function main() {
  const bytes = fs.readFileSync(path.join(root, "game_3d/models/map_fptu.glb"));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  const binaryOffset = 28 + jsonLength;
  const materials = gltf.materials.map((material) => {
    const result = new THREE.MeshStandardMaterial(); result.name = material.name ?? ""; return result;
  });
  function accessor(index) {
    const item = gltf.accessors[index], view = gltf.bufferViews[item.bufferView];
    const count = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[item.type];
    const size = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[item.componentType];
    if (!count || !size) throw new Error("Unsupported GLB accessor");
    const values = new (item.componentType === 5126 ? Float32Array : Uint32Array)(item.count * count);
    for (let i = 0; i < item.count; i++) for (let j = 0; j < count; j++) {
      const offset = binaryOffset + (view.byteOffset ?? 0) + (item.byteOffset ?? 0) + i * (view.byteStride ?? size * count) + j * size;
      values[i * count + j] = item.componentType === 5126 ? bytes.readFloatLE(offset)
        : item.componentType === 5125 ? bytes.readUInt32LE(offset) : item.componentType === 5123 ? bytes.readUInt16LE(offset) : bytes.readUInt8(offset);
    }
    return values;
  }
  function mesh(primitive) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(accessor(primitive.attributes.POSITION), 3));
    if (primitive.indices !== undefined) geometry.setIndex(new THREE.BufferAttribute(accessor(primitive.indices), 1));
    return new THREE.Mesh(geometry, materials[primitive.material]);
  }
  const nodes = gltf.nodes.map((node) => {
    const primitives = node.mesh === undefined ? [] : gltf.meshes[node.mesh].primitives;
    const object = primitives.length === 1 ? mesh(primitives[0]) : new THREE.Group();
    if (primitives.length > 1) primitives.forEach((primitive, index) => {
      const part = mesh(primitive); part.name = `${gltf.meshes[node.mesh].name}_${index}`; object.add(part);
    });
    object.name = THREE.PropertyBinding.sanitizeNodeName(node.name ?? "");
    if (node.matrix) { object.matrix.fromArray(node.matrix); object.matrixAutoUpdate = false; }
    else {
      if (node.translation) object.position.fromArray(node.translation);
      if (node.rotation) object.quaternion.fromArray(node.rotation);
      if (node.scale) object.scale.fromArray(node.scale);
    }
    return object;
  });
  gltf.nodes.forEach((node, index) => node.children?.forEach((child) => nodes[index].add(nodes[child])));
  const scene = new THREE.Group(); gltf.scenes[gltf.scene ?? 0].nodes.forEach((index) => scene.add(nodes[index]));
  const api = sourceModule("game_3d/campusWorld.ts");
  const campus = api.prepareCampusWorld(scene);
  const rapier = require("@dimforge/rapier3d-compat"); await rapier.init();
  const world = new rapier.World({ x: 0, y: -9.81, z: 0 });
  world.createCollider(rapier.ColliderDesc.trimesh(campus.vertices, campus.indices));
  for (const door of campus.doors) world.createCollider(rapier.ColliderDesc.cuboid(...door.halfExtents.toArray())
    .setTranslation(door.hinge.x + door.center.x, door.hinge.y + door.center.y, door.hinge.z + door.center.z));
  const body = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 30, 0));
  const collider = world.createCollider(rapier.ColliderDesc.capsule(api.PLAYER_HALF_SEGMENT, api.PLAYER_RADIUS), body);
  const spawn = api.findCampusSpawn(rapier, world, campus, collider, body);
  const spawns = [spawn];
  const grid = [];
  for (let x = -4; x <= 4; x++) for (let z = -4; z <= 4; z++) if (x || z) grid.push([x, z]);
  grid.sort((a, b) => Math.hypot(...a) - Math.hypot(...b));
  const candidates = [...grid.map(([x, z]) => new THREE.Vector3(spawn.x + x * 1.7, 3, spawn.z + z * 1.7)), ...campus.spawnCandidates];
  for (const candidate of candidates) {
    if (spawns.length >= 30) break;
    try {
      const safe = api.findCampusSpawn(rapier, world, { ...campus, spawnCandidates: [candidate] }, collider, body);
      if (spawns.every((other) => Math.hypot(safe.x - other.x, safe.z - other.z) >= 1.2)) spawns.push(safe);
    } catch { /* Skip obstructed candidates. */ }
  }
  if (spawns.length < 30) throw new Error("Map needs 30 safe multiplayer spawn positions");
  const vector = (value) => value.toArray().map((number) => Number(number.toFixed(6)));
  const mapId = crypto.createHash("sha256").update(bytes).digest("hex");
  const manifest = { mapId, boundsMin: vector(campus.bounds.min), boundsMax: vector(campus.bounds.max), spawn: vector(spawn), spawns: spawns.map(vector),
    doors: campus.doors.map((door) => ({ id: door.id, hinge: vector(door.hinge), center: vector(door.center), halfExtents: vector(door.halfExtents) })),
    seats: campus.seats.map((seat) => ({ id: seat.id, position: vector(seat.position), floorY: Number(seat.floorY.toFixed(6)) })),
  };
  const output = path.resolve(root, "../backend/src/main/resources/campus-map.json");
  fs.writeFileSync(output, JSON.stringify(manifest, null, 2) + "\n");
  const protocol = path.join(root, "game_3d/campusMultiplayer.ts");
  if (fs.existsSync(protocol)) {
    const source = fs.readFileSync(protocol, "utf8");
    fs.writeFileSync(protocol, source.replace(/export const CAMPUS_MAP_ID = "[^"]*";/, `export const CAMPUS_MAP_ID = "${mapId}";`));
  }
  world.free();
  console.log(`Exported ${manifest.doors.length} doors, ${manifest.seats.length} seats; map ${mapId.slice(0, 12)}.`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });

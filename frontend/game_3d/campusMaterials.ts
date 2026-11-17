import {
  CanvasTexture,
  Color,
  Group,
  Material,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  Vector2,
} from "three";

// Cache generated procedural textures to avoid recreation and save GPU memory
let woodTextureCache: CanvasTexture | null = null;
let fabricTextureCache: CanvasTexture | null = null;
let stoneTextureCache: CanvasTexture | null = null;
let tileTextureCache: CanvasTexture | null = null;

function getWoodTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (woodTextureCache) return woodTextureCache;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Base warm birch / oak laminate color
  ctx.fillStyle = "#edd9be";
  ctx.fillRect(0, 0, 512, 512);

  // Soft wood grain waves
  ctx.lineWidth = 1.5;
  for (let y = 0; y < 512; y += 3) {
    const wave = Math.sin(y * 0.04) * 8 + Math.cos(y * 0.015) * 5;
    const tone = 205 + Math.floor(Math.sin(y * 0.08) * 18 + Math.random() * 12);
    ctx.strokeStyle = `rgb(${tone + 10}, ${tone - 10}, ${tone - 35})`;
    ctx.beginPath();
    ctx.moveTo(0, y + wave);
    ctx.bezierCurveTo(
      150,
      y + wave + Math.sin(y * 0.05) * 6,
      350,
      y + wave - Math.cos(y * 0.03) * 6,
      512,
      y + wave,
    );
    ctx.stroke();
  }

  // Subtle wood pores
  for (let i = 0; i < 2000; i++) {
    const px = Math.random() * 512;
    const py = Math.random() * 512;
    const length = 2 + Math.random() * 6;
    ctx.fillStyle = "rgba(160, 130, 95, 0.18)";
    ctx.fillRect(px, py, length, 1);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(4, 4);
  woodTextureCache = texture;
  return texture;
}

function getFabricTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (fabricTextureCache) return fabricTextureCache;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, 256, 256);

  // Micro woven weave pattern
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const pattern = ((x % 4 < 2) === (y % 4 < 2) ? 22 : -22) + (Math.random() * 16 - 8);
      const val = Math.min(255, Math.max(0, 128 + pattern));
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(12, 12);
  fabricTextureCache = texture;
  return texture;
}

function getStoneTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (stoneTextureCache) return stoneTextureCache;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#c8c6c2";
  ctx.fillRect(0, 0, 256, 256);

  // Speckled granite flecks
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = Math.random();
    ctx.fillStyle = r > 0.6 ? "rgba(45, 45, 50, 0.35)" : r > 0.3 ? "rgba(240, 240, 245, 0.4)" : "rgba(140, 130, 120, 0.25)";
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(6, 6);
  stoneTextureCache = texture;
  return texture;
}

function getTileTexture(): CanvasTexture | null {
  if (typeof document === "undefined") return null;
  if (tileTextureCache) return tileTextureCache;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#f4f1ea";
  ctx.fillRect(0, 0, 256, 256);

  // Tile grout border
  ctx.strokeStyle = "rgba(180, 175, 165, 0.6)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, 254, 254);

  // Porcelain sheen variation
  for (let i = 0; i < 800; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255, 255, 255, 0.15)" : "rgba(210, 205, 195, 0.1)";
    ctx.fillRect(x, y, 2, 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(8, 8);
  tileTextureCache = texture;
  return texture;
}

/**
 * Enhances standard GLTF materials with realistic PBR properties,
 * procedural canvas textures, and balanced roughness/metalness.
 */
export function applyRealisticMaterials(root: Object3D) {
  if (typeof document === "undefined") return;

  const woodTexture = getWoodTexture();
  const fabricTexture = getFabricTexture();
  const stoneTexture = getStoneTexture();
  const tileTexture = getTileTexture();

  root.traverse((node) => {
    if (!(node instanceof Mesh)) return;

    const materials = Array.isArray(node.material) ? node.material : [node.material];

    materials.forEach((mat) => {
      if (!(mat instanceof MeshStandardMaterial)) return;

      const name = mat.name.toLowerCase();
      const nodeName = node.name.toLowerCase();

      // 1. Desktops, Laminate tables & Wooden furniture
      if (/desktop|laminate|table top|wood trim|handrail/i.test(name) || /table|desk/i.test(nodeName)) {
        if (/stone/i.test(name)) {
          // Stone tabletops
          mat.roughness = 0.42;
          mat.metalness = 0.05;
          if (stoneTexture && !mat.map) {
            mat.map = stoneTexture;
            mat.needsUpdate = true;
          }
        } else {
          // Wooden / laminate desks
          mat.roughness = 0.35; // smooth tactile laminate sheen
          mat.metalness = 0.02;
          if (woodTexture && !mat.map) {
            mat.map = woodTexture;
            mat.needsUpdate = true;
          }
        }
      }

      // 2. Chairs, Seating fabric & Sofa cushions
      else if (/chair upholstery|chair backs|sofa|cushion/i.test(name)) {
        mat.roughness = 0.86; // matte soft textile
        mat.metalness = 0.0;
        if (fabricTexture && !mat.bumpMap) {
          mat.bumpMap = fabricTexture;
          mat.bumpScale = 0.015;
          mat.needsUpdate = true;
        }
      }

      // 3. Metallic furniture: tubular legs, stainless handrails, metal frames
      else if (/tubular furniture|stainless rails|glazing frame|silver|metal/i.test(name) || /railing|handrail/i.test(nodeName)) {
        mat.roughness = 0.24; // brushed metallic finish
        mat.metalness = 0.88; // realistic metal reflection
        mat.needsUpdate = true;
      }

      // 4. Floor tiles & porcelain surfaces
      else if (/porcelain tile|checker tile|mat_tile/i.test(name) || /floor/i.test(nodeName)) {
        mat.roughness = 0.3; // reflective indoor flooring
        mat.metalness = 0.04;
        if (tileTexture && !mat.map && !name.includes("checker")) {
          mat.map = tileTexture;
          mat.needsUpdate = true;
        }
      }

      // 5. Architectural Glass & partitions
      else if (/glazing|partition glass|display glass|tinted glass/i.test(name) || /window|glass/i.test(nodeName)) {
        mat.transparent = true;
        mat.opacity = name.includes("tinted") ? 0.6 : 0.38;
        mat.roughness = 0.08; // crisp architectural glass
        mat.metalness = 0.12;
        mat.needsUpdate = true;
      }

      // 6. Walls, Plaster, Painted concrete
      else if (/plaster|concrete|ivory_wall|painted/i.test(name) || /wall/i.test(nodeName)) {
        mat.roughness = 0.92; // soft diffuse matte wall
        mat.metalness = 0.0;
      }

      // 7. Foliage / Trees / Plants
      else if (/foliage|leaves|palm/i.test(name) || /tree|plant|leaf/i.test(nodeName)) {
        mat.roughness = 0.72;
        mat.metalness = 0.0;
      }
    });
  });
}

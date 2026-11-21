import type { CampusCharacter } from "./CampusAvatar";

export type CharacterOutfit = "fptu-orange" | "cyber-black" | "sport-white" | "bomber-blue";
export type CharacterAccessory = "none" | "glasses" | "headphones" | "both";
export type CharacterHairColor = "natural-black" | "chestnut-brown" | "fptu-orange" | "silver-ash";

export interface CharacterCustomization {
  character: CampusCharacter;
  outfit: CharacterOutfit;
  accessory: CharacterAccessory;
  hairColor: CharacterHairColor;
}

export interface OutfitOption {
  id: CharacterOutfit;
  name: string;
  desc: string;
  jacketColorMale: string;
  jacketColorFemale: string;
  pantsColor: string;
  accentColor: string;
}

export interface AccessoryOption {
  id: CharacterAccessory;
  name: string;
  desc: string;
  icon: string;
}

export interface HairColorOption {
  id: CharacterHairColor;
  name: string;
  hex: string;
}

export const OUTFIT_OPTIONS: OutfitOption[] = [
  {
    id: "fptu-orange",
    name: "Cam FPTU Signature",
    desc: "Đồng phục cam đặc trưng của trường",
    jacketColorMale: "#ea5b0c",
    jacketColorFemale: "#e25812",
    pantsColor: "#1e293b",
    accentColor: "#f97316",
  },
  {
    id: "cyber-black",
    name: "Cyber Dev Hoodie",
    desc: "Hoodie đen cá tính cho coder xuyên màn đêm",
    jacketColorMale: "#18181b",
    jacketColorFemale: "#27272a",
    pantsColor: "#0f172a",
    accentColor: "#38bdf8",
  },
  {
    id: "sport-white",
    name: "Võ phục Vovinam",
    desc: "Võ phục xanh và đai xanh truyền thống Vovinam FPT",
    jacketColorMale: "#1d4ed8",
    jacketColorFemale: "#1d4ed8",
    pantsColor: "#1d4ed8",
    accentColor: "#3b82f6",
  },
  {
    id: "bomber-blue",
    name: "Campus Bomber",
    desc: "Áo khoác bomber thanh lịch, thời trang",
    jacketColorMale: "#1e3a5f",
    jacketColorFemale: "#831843",
    pantsColor: "#334155",
    accentColor: "#f59e0b",
  },
];

export const ACCESSORY_OPTIONS: AccessoryOption[] = [
  { id: "none", name: "Cơ bản", desc: "Không phụ kiện", icon: "👤" },
  { id: "glasses", name: "Kính tri thức", desc: "Kính công nghệ thanh lịch", icon: "👓" },
  { id: "headphones", name: "Tai nghe Pro", desc: "Headphones gaming & study", icon: "🎧" },
  { id: "both", name: "Full Combo", desc: "Kính + Tai nghe sành điệu", icon: "✨" },
];

export const HAIR_COLOR_OPTIONS: HairColorOption[] = [
  { id: "natural-black", name: "Đen tự nhiên", hex: "#1f1d24" },
  { id: "chestnut-brown", name: "Nâu hạt dẻ", hex: "#4a2818" },
  { id: "fptu-orange", name: "Highlight Cam", hex: "#c2410c" },
  { id: "silver-ash", name: "Khói bạc", hex: "#94a3b8" },
];

export const DEFAULT_CUSTOMIZATION: Record<CampusCharacter, CharacterCustomization> = {
  male: {
    character: "male",
    outfit: "fptu-orange",
    accessory: "none",
    hairColor: "natural-black",
  },
  female: {
    character: "female",
    outfit: "fptu-orange",
    accessory: "none",
    hairColor: "natural-black",
  },
};

const STORAGE_KEY = "fptu_campus_character_customization_v1";

export function loadCharacterCustomization(character: CampusCharacter): CharacterCustomization {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${character}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        character,
        outfit: parsed.outfit || "fptu-orange",
        accessory: parsed.accessory || "none",
        hairColor: parsed.hairColor || "natural-black",
      };
    }
  } catch {
    // ignore parse error
  }
  return DEFAULT_CUSTOMIZATION[character];
}

export function saveCharacterCustomization(customization: CharacterCustomization): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${customization.character}`, JSON.stringify(customization));
  } catch {
    // ignore storage error
  }
}

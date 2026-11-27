// Cột material_content trong DB chỉ có một, còn UC-47 yêu cầu nhập quy tắc riêng cho
// Nhóm I, II, III. buildMaterialContent gộp ba phần khi tạo; parseMaterialContent tách lại cho màn Update.

export type VerbGroupKey = "group1" | "group2" | "group3";
export type VerbGroupRules = Record<VerbGroupKey, string>;

export const VERB_GROUPS: ReadonlyArray<{ key: VerbGroupKey; label: string }> = [
  { key: "group1", label: "Nhóm I" },
  { key: "group2", label: "Nhóm II" },
  { key: "group3", label: "Nhóm III" },
];

export function buildMaterialContent(groups: VerbGroupRules): string {
  return VERB_GROUPS.map(({ key, label }) => `【${label}】\n${groups[key].trim()}`).join("\n\n");
}

export function parseMaterialContent(text = ""): VerbGroupRules {
  const result: VerbGroupRules = { group1: "", group2: "", group3: "" };
  const keyByLabel = new Map(VERB_GROUPS.map(({ key, label }) => [label, key]));
  const pattern = /【(Nhóm I{1,3})】\n?([\s\S]*?)(?=\n*【Nhóm I{1,3}】|$)/g;
  for (const match of text.matchAll(pattern)) {
    const key = keyByLabel.get(match[1]);
    if (key) result[key] = match[2].trim();
  }
  return result;
}

// ===== Hiển thị tài liệu cho học viên (3.6.25: bảng Quy tắc / Ví dụ / Kết quả) =====

export interface MaterialRow {
  rule: string;
  example: string;
  result: string;
}

export interface GroupMaterial {
  notes: string[];
  rows: MaterialRow[];
}

/**
 * Tách phần quy tắc của một nhóm: dòng có “→” (hoặc “->”, “⇒”) là ví dụ “書く → 書いて”, các dòng khác là
 * quy tắc. Mỗi ví dụ gắn với quy tắc gần nhất phía trên. Ghi chú trong ngoặc sau kết quả (ngoại lệ) được giữ nguyên.
 */
export function parseGroupMaterial(text = ""): GroupMaterial {
  const notes: string[] = [];
  const rows: MaterialRow[] = [];
  let rule = "";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/^[-•・*]\s*/, "");
    if (!line) continue;
    const parts = line.split(/\s*(?:→|->|⇒|＝>)\s*/);
    if (parts.length >= 2 && parts[0] && parts[1]) {
      rows.push({ rule, example: parts[0], result: parts.slice(1).join(" → ") });
    } else {
      rule = line.replace(/[:：]$/, "");
      notes.push(line);
    }
  }
  return { notes, rows };
}

export const VERB_GROUP_INFO: Record<VerbGroupKey, string> = {
  group1: "Động từ nhóm I (五段動詞): kết thúc bằng âm cột う như う, く, ぐ, す, つ, ぬ, ぶ, む, る. Ví dụ: 書く, 飲む, 話す.",
  group2: "Động từ nhóm II (一段動詞): kết thúc bằng る, âm trước る thuộc cột い hoặc え. Ví dụ: 食べる, 見る, 寝る (ngoại lệ thuộc nhóm I: 帰る, 入る, 走る…).",
  group3: "Động từ nhóm III (bất quy tắc): する, 来る(くる) và các động từ dạng danh từ + する như 勉強する.",
};

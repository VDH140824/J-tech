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

export interface LessonDocument { name: string; url: string; publicId?: string }
export function lessonDocuments(value?: string): LessonDocument[] {
  if (!value?.trim()) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { parsed = value; }
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items.flatMap(item => {
    if (typeof item === "string") return /^https?:\/\//i.test(item) ? [{ name: "Tài liệu tham khảo", url: item }] : [];
    if (item && typeof item === "object" && typeof item.url === "string" && /^https?:\/\//i.test(item.url)) {
      return [{ ...item, name: typeof item.name === "string" ? item.name : "Tài liệu tham khảo", url: item.url }];
    }
    return [];
  });
}

export interface LessonDocument {
  name: string;
  url: string;
}

export function getPdfPreviewUrl(value: string): string {
  const url = new URL(value);
  const [parameters, ...directives] = url.hash.slice(1).split(":~:");
  const options = new URLSearchParams(parameters);
  options.set("toolbar", "0");
  options.set("navpanes", "0");
  options.set("view", "FitH");
  url.hash = options.toString() + (directives.length ? `:~:${directives.join(":~:")}` : "");
  return url.toString();
}

export function isDocumentUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password
    );
  } catch {
    return false;
  }
}

// Support existing JSON documents and URL-only input without rendering unsafe schemes.
export function parseLessonDocuments(raw?: string | null): LessonDocument[] {
  if (!raw?.trim()) return [];
  let value: unknown = raw.trim();
  try {
    value = JSON.parse(raw);
  } catch {
    /* Legacy plain URLs. */
  }
  const entries = Array.isArray(value) ? value : [value];
  const documents: LessonDocument[] = [];
  for (const entry of entries) {
    const record =
      entry && typeof entry === "object" ? (entry as Record<string, unknown>) : undefined;
    const url = typeof entry === "string" ? entry.trim() : String(record?.url ?? "").trim();
    if (!isDocumentUrl(url) || documents.some((document) => document.url === url)) continue;
    documents.push({
      url,
      name:
        typeof record?.name === "string" && record.name.trim()
          ? record.name
          : `Tài liệu PDF ${documents.length + 1}`,
    });
  }
  return documents;
}

export function serializeDocumentUrls(input: string, previous?: string): string {
  const previousDocuments = parseLessonDocuments(previous);
  const urls = [
    ...new Set(
      input
        .split(/\r?\n/)
        .map((url) => url.trim())
        .filter(Boolean),
    ),
  ];
  if (urls.some((url) => !isDocumentUrl(url))) {
    throw new Error("Vui lòng nhập URL PDF HTTP hoặc HTTPS hợp lệ, mỗi dòng một URL.");
  }
  return JSON.stringify(
    urls.map((url, index) => ({
      name:
        previousDocuments.find((document) => document.url === url)?.name ??
        `Tài liệu PDF ${index + 1}`,
      url,
    })),
  );
}

/** Một đoạn chữ: chữ thường, hoặc chữ Hán kèm cách đọc (từ cú pháp {漢字|かんじ}). */
export type FuriganaSegment = { text: string; reading?: string };

// {漢字|かんじ}; {ベトナム} (không có "|") là chữ AI bọc nhầm, chỉ hiển thị phần chữ bên trong.
const MARKUP = /\{([^{}|]+)(?:\|([^{}|]*))?\}/g;

export function parseFurigana(value: string | null | undefined): FuriganaSegment[] {
  if (!value) return [];
  const segments: FuriganaSegment[] = [];
  let last = 0;
  for (const match of value.matchAll(MARKUP)) {
    const start = match.index ?? 0;
    if (start > last) segments.push({ text: value.slice(last, start) });
    const reading = (match[2] ?? "").trim();
    segments.push(reading ? { text: match[1], reading } : { text: match[1] });
    last = start + match[0].length;
  }
  if (last < value.length) segments.push({ text: value.slice(last) });
  return segments;
}

/** Chữ hiển thị khi không cần furigana (đọc to, tiêu đề lịch sử…). */
export function stripFurigana(value: string | null | undefined): string {
  return value ? value.replace(MARKUP, "$1") : "";
}
